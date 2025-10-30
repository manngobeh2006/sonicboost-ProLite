// Mock database for development when PostgreSQL is not available
const mockDb = {
  query: async (query, params = []) => {
    console.log('📝 Demo mode: Database query skipped');
    console.log('   Query:', query.substring(0, 50) + '...');
    return { rows: [] };
  },
  
  connect: async () => {
    console.log('📝 Demo mode: Database connection skipped');
    return {
      query: mockDb.query,
      release: () => {}
    };
  }
};

module.exports = mockDb;
