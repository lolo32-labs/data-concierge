# DataConcierge

AI-powered business data assistant. Ask your business data anything in plain English.

## Quick Start (Development)

1. **Clone and install:**
   ```bash
   git clone https://github.com/Chhayly-and-AI/data-concierge.git
   cd data-concierge
   npm install
   ```

2. **Set up environment:**
   ```bash
   cp .env.local.example .env.local
   # Edit .env.local with your database and Gemini API credentials
   ```

3. **Set up database:**
   ```bash
   psql $DATABASE_URL -f db/setup.sql
   ```

4. **Load example client:**
   ```bash
   cd ingestion
   python3 -m venv .venv && source .venv/bin/activate
   pip install -r requirements.txt
   python load.py ../clients/example --db-url $DATABASE_URL
   python sync_config.py --clients-dir ../clients --db-url $DATABASE_URL
   cd ..
   ```

5. **Run the app:**
   ```bash
   npm run dev
   ```

6. **Open:** http://localhost:3000/example/login (password: `demo123`)

## Onboarding a New Client

1. Create `clients/<client-id>/config.yaml` (see `clients/example/` for reference)
2. Put their data files in `clients/<client-id>/raw/`
3. Run: `cd ingestion && python load.py ../clients/<client-id>`
4. Run: `python sync_config.py --clients-dir ../clients`
5. Share the URL: `https://your-domain.com/<client-id>/login`

## Deploy to Vercel

1. Push to GitHub
2. Import in Vercel
3. Add environment variables: `DATABASE_URL`, `DATABASE_READONLY_URL`, `GEMINI_API_KEY`
4. Deploy
