export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="text-center">
        <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-100">DataConcierge</h1>
        <p className="text-gray-500 mt-2 text-sm">Ask your business data anything.</p>
        <p className="text-gray-600 mt-4 text-xs">Contact your administrator for access.</p>
      </div>
    </div>
  );
}
