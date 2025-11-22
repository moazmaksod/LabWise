
import { ObjectId } from 'mongodb';

// Simple in-memory store
const store: Record<string, any[]> = {
    users: [],
    patients: [],
    orders: [],
    testCatalog: [],
    appointments: [],
    instruments: [],
    qcLogs: [],
    auditLogs: []
};

class MockCollection {
    name: string;
    constructor(name: string) {
        this.name = name;
    }

    async find(query: any = {}) {
        const data = store[this.name] || [];
        // Extremely basic filtering logic for mock purposes
        const filtered = data.filter(item => {
            for (const key in query) {
                if (query[key] instanceof RegExp) {
                     if (!query[key].test(item[key])) return false;
                } else if (typeof query[key] === 'object') {
                    // Skip complex queries for mock
                    return true;
                } else if (item[key] !== query[key]) {
                    return false;
                }
            }
            return true;
        });

        return {
            sort: () => ({
                limit: () => ({
                    toArray: async () => filtered
                }),
                toArray: async () => filtered
            }),
            limit: () => ({
                toArray: async () => filtered
            }),
            toArray: async () => filtered
        };
    }

    async findOne(query: any) {
        const data = store[this.name] || [];
         return data.find(item => {
            for (const key in query) {
                 if (key === '_id' && typeof query[key] === 'object') {
                     // Handle ObjectId comparison
                      if (item._id.toString() !== query[key].toString()) return false;
                 } else if (item[key] !== query[key]) {
                    return false;
                }
            }
            return true;
        }) || null;
    }

    async insertOne(doc: any) {
        if (!doc._id) doc._id = new ObjectId();
        if (!store[this.name]) store[this.name] = [];
        store[this.name].push(doc);
        return { insertedId: doc._id };
    }

    async insertMany(docs: any[]) {
        docs.forEach(d => {
            if (!d._id) d._id = new ObjectId();
        });
        if (!store[this.name]) store[this.name] = [];
        store[this.name].push(...docs);
        return { insertedIds: docs.map(d => d._id) };
    }

    async updateOne(filter: any, update: any) {
        const item = await this.findOne(filter);
        if (item) {
            if (update.$set) {
                Object.assign(item, update.$set);
                // Handle dot notation for nested updates (e.g. samples.0.status)
                Object.keys(update.$set).forEach(key => {
                    if (key.includes('.')) {
                        const parts = key.split('.');
                        let current = item;
                        for (let i = 0; i < parts.length - 1; i++) {
                            current = current[parts[i]];
                        }
                        current[parts[parts.length - 1]] = update.$set[key];
                    }
                });
            }
            return { matchedCount: 1, modifiedCount: 1 };
        }
        return { matchedCount: 0, modifiedCount: 0 };
    }

    async aggregate(pipeline: any[]) {
        // Mock aggregation is hard. We just return all data for "worklist" type queries usually.
        return {
            toArray: async () => {
                return store[this.name] || [];
            }
        };
    }

    async countDocuments() {
        return (store[this.name] || []).length;
    }

    async createIndex() { return; }
    async dropIndex() { return; }
    async indexes() { return []; }
    async findOneAndUpdate(filter: any, update: any, options: any) {
         // Mock counter behavior
         let item = await this.findOne(filter);
         if (!item && options.upsert) {
             item = { _id: filter._id, sequence_value: 0 };
             store[this.name].push(item);
         }
         if (item && update.$inc) {
             item.sequence_value += update.$inc.sequence_value;
         }
         return item;
    }
}

export class MockDb {
    collection(name: string) {
        return new MockCollection(name);
    }
}

export class MockClient {
    db(name: string) {
        return new MockDb();
    }
    async connect() { return; }
    async close() { return; }
}
