/**
 * ProfitSight — Shopify GraphQL API Prototype (PDM-46)
 *
 * Purpose: Validate the data model by pulling real data from a Shopify dev store.
 * Run: npx tsx scripts/shopify-prototype.ts
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

const STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN!;
const ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN!;
const API_VERSION = '2025-01'; // Use a stable version

const GRAPHQL_URL = `https://${STORE_DOMAIN}/admin/api/${API_VERSION}/graphql.json`;

async function shopifyGraphQL(query: string, variables?: Record<string, unknown>) {
  const res = await fetch(GRAPHQL_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': ACCESS_TOKEN,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Shopify API ${res.status}: ${text}`);
  }

  const json = await res.json();
  if (json.errors) {
    throw new Error(`GraphQL errors: ${JSON.stringify(json.errors, null, 2)}`);
  }

  return json.data;
}

// ── Test 1: Shop Info ───────────────────────────────────────────────────────
async function testShopInfo() {
  console.log('\n═══ Test 1: Shop Info ═══');

  const data = await shopifyGraphQL(`{
    shop {
      name
      email
      myshopifyDomain
      plan { displayName }
      currencyCode
      timezoneAbbreviation
      primaryDomain { url }
    }
  }`);

  console.log('Store:', data.shop.name);
  console.log('Domain:', data.shop.myshopifyDomain);
  console.log('Plan:', data.shop.plan.displayName);
  console.log('Currency:', data.shop.currencyCode);
  console.log('Timezone:', data.shop.timezoneAbbreviation);
  return data.shop;
}

// ── Test 2: Products ────────────────────────────────────────────────────────
async function testProducts() {
  console.log('\n═══ Test 2: Products ═══');

  const data = await shopifyGraphQL(`{
    products(first: 10) {
      edges {
        node {
          id
          title
          productType
          vendor
          status
          variants(first: 5) {
            edges {
              node {
                id
                title
                sku
                price
                compareAtPrice
                inventoryQuantity
              }
            }
          }
        }
      }
      pageInfo { hasNextPage }
    }
  }`);

  const products = data.products.edges.map((e: any) => e.node);
  console.log(`Found ${products.length} products`);

  for (const p of products) {
    const variants = p.variants.edges.map((e: any) => e.node);
    console.log(`  ${p.title} (${p.status}) — ${variants.length} variant(s)`);
    for (const v of variants) {
      console.log(`    ${v.title}: $${v.price} | SKU: ${v.sku || 'none'} | Stock: ${v.inventoryQuantity ?? 'N/A'}`);
    }
  }

  console.log(`Has more products: ${data.products.pageInfo.hasNextPage}`);
  return products;
}

// ── Test 3: Orders ──────────────────────────────────────────────────────────
async function testOrders() {
  console.log('\n═══ Test 3: Orders ═══');

  const data = await shopifyGraphQL(`{
    orders(first: 10, sortKey: CREATED_AT, reverse: true) {
      edges {
        node {
          id
          name
          createdAt
          displayFinancialStatus
          displayFulfillmentStatus
          currencyCode
          subtotalPriceSet { shopMoney { amount currencyCode } }
          totalPriceSet { shopMoney { amount currencyCode } }
          totalShippingPriceSet { shopMoney { amount currencyCode } }
          totalTaxSet { shopMoney { amount currencyCode } }
          totalDiscountsSet { shopMoney { amount currencyCode } }
          totalRefundedSet { shopMoney { amount currencyCode } }
          currentTotalPriceSet { shopMoney { amount currencyCode } }
          channelInformation { channelDefinition { channelName } }
          lineItems(first: 10) {
            edges {
              node {
                id
                title
                quantity
                originalUnitPriceSet { shopMoney { amount } }
                discountedUnitPriceSet { shopMoney { amount } }
                variant {
                  id
                  sku
                  product { id title }
                }
              }
            }
          }
          refunds {
            id
            createdAt
            totalRefundedSet { shopMoney { amount } }
            refundLineItems(first: 10) {
              edges {
                node {
                  lineItem { id }
                  quantity
                  subtotalSet { shopMoney { amount } }
                }
              }
            }
          }
        }
      }
      pageInfo { hasNextPage }
    }
  }`);

  const orders = data.orders.edges.map((e: any) => e.node);
  console.log(`Found ${orders.length} orders`);

  for (const o of orders) {
    const lineItems = o.lineItems.edges.map((e: any) => e.node);
    const channel = o.channelInformation?.channelDefinition?.channelName || 'Unknown';

    console.log(`\n  ${o.name} | ${o.displayFinancialStatus} | ${o.displayFulfillmentStatus || 'N/A'} | ${channel}`);
    console.log(`    Created: ${o.createdAt}`);
    console.log(`    Subtotal: $${o.subtotalPriceSet.shopMoney.amount}`);
    console.log(`    Shipping: $${o.totalShippingPriceSet.shopMoney.amount}`);
    console.log(`    Tax: $${o.totalTaxSet.shopMoney.amount}`);
    console.log(`    Discounts: $${o.totalDiscountsSet.shopMoney.amount}`);
    console.log(`    Refunded: $${o.totalRefundedSet.shopMoney.amount}`);
    console.log(`    Current Total: $${o.currentTotalPriceSet.shopMoney.amount}`);
    console.log(`    Line Items (${lineItems.length}):`);

    for (const li of lineItems) {
      const product = li.variant?.product?.title || 'Unknown Product';
      console.log(`      ${li.quantity}x ${product} @ $${li.originalUnitPriceSet.shopMoney.amount} (discounted: $${li.discountedUnitPriceSet.shopMoney.amount})`);
    }

    if (o.refunds.length > 0) {
      console.log(`    Refunds (${o.refunds.length}):`);
      for (const r of o.refunds) {
        const refundItems = r.refundLineItems.edges.map((e: any) => e.node);
        console.log(`      Refund ${r.id}: $${r.totalRefundedSet.shopMoney.amount} on ${r.createdAt}`);
        for (const ri of refundItems) {
          console.log(`        ${ri.quantity}x item refunded: $${ri.subtotalSet.shopMoney.amount}`);
        }
      }
    }
  }

  console.log(`\nHas more orders: ${data.orders.pageInfo.hasNextPage}`);
  return orders;
}

// ── Test 4: Order Count ─────────────────────────────────────────────────────
async function testOrderCount() {
  console.log('\n═══ Test 4: Order Count ═══');

  const data = await shopifyGraphQL(`{
    ordersCount { count }
  }`);

  console.log(`Total orders: ${data.ordersCount.count}`);
  return data.ordersCount.count;
}

// ── Test 5: Available Scopes ────────────────────────────────────────────────
async function testScopes() {
  console.log('\n═══ Test 5: Access Scopes ═══');

  try {
    const data = await shopifyGraphQL(`{
      appInstallation {
        accessScopes { handle }
      }
    }`);

    const scopes = data.appInstallation.accessScopes.map((s: any) => s.handle);
    console.log('Granted scopes:', scopes.join(', '));

    const needed = ['read_orders', 'read_products'];
    const hasAll = needed.every(s => scopes.includes(s));
    console.log(`Has required scopes: ${hasAll ? 'YES' : 'NO — MISSING: ' + needed.filter(s => !scopes.includes(s)).join(', ')}`);

    return scopes;
  } catch (e) {
    console.log('Could not query scopes (may need different token type)');
    return [];
  }
}

// ── Run All Tests ───────────────────────────────────────────────────────────
async function main() {
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║  ProfitSight — Shopify API Prototype (PDM-46)   ║');
  console.log('║  Store:', STORE_DOMAIN.padEnd(40), '║');
  console.log('╚══════════════════════════════════════════════════╝');

  if (!STORE_DOMAIN || !ACCESS_TOKEN) {
    console.error('ERROR: SHOPIFY_STORE_DOMAIN and SHOPIFY_ACCESS_TOKEN must be set in .env.local');
    process.exit(1);
  }

  try {
    await testShopInfo();
    await testProducts();
    const orderCount = await testOrderCount();
    await testOrders();
    await testScopes();

    console.log('\n═══ Summary ═══');
    console.log('✓ API connection works');
    console.log(`✓ Total orders: ${orderCount}`);
    console.log('✓ Data model validated — see output above for field structure');
    console.log('\nNext steps:');
    console.log('1. Add test products and orders to the dev store if empty');
    console.log('2. Test with refunds and discounts to validate edge cases');
    console.log('3. Proceed to DB schema design (PDM-47)');

  } catch (error) {
    console.error('\n❌ ERROR:', error);
    console.error('\nTroubleshooting:');
    console.error('- Is SHOPIFY_STORE_DOMAIN correct?', STORE_DOMAIN);
    console.error('- Is SHOPIFY_ACCESS_TOKEN valid?');
    console.error('- Does the token have read_orders + read_products scopes?');
    process.exit(1);
  }
}

main();
