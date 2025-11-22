
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
    auditLogs: [],
    inventoryItems: []
};

class MockCollection {
    name: string;
    constructor(name: string) {
        this.name = name;
    }

    async find(query: any = {}) {
        const data = store[this.name] || [];
        const filtered = data.filter(item => this._matches(item, query));

        return {
            sort: () => ({
                limit: () => ({ toArray: async () => filtered }),
                toArray: async () => filtered
            }),
            limit: () => ({ toArray: async () => filtered }),
            toArray: async () => filtered
        };
    }

    async findOne(query: any) {
        const data = store[this.name] || [];
        return data.find(item => this._matches(item, query)) || null;
    }

    _matches(item: any, query: any): boolean {
        for (const key in query) {
            const val = query[key];
            if (key === '_id' && typeof val === 'object' && val.toString) {
                if (item._id.toString() !== val.toString()) return false;
            } else if (key === '$or' && Array.isArray(val)) {
                if (!val.some(cond => this._matches(item, cond))) return false;
            } else if (key.includes('.')) {
                const parts = key.split('.');
                let current = item;
                for (let part of parts) {
                    if (current === undefined || current === null) break;
                    current = current[part];
                }
                if (current === undefined) return false;
            } else if (val instanceof RegExp) {
                if (!val.test(item[key])) return false;
            } else if (item[key] !== val) {
                return false;
            }
        }
        return true;
    }

    async insertOne(doc: any) {
        if (!doc._id) doc._id = new ObjectId();
        if (!store[this.name]) store[this.name] = [];
        store[this.name].push(doc);
        return { insertedId: doc._id };
    }

    async insertMany(docs: any[]) {
        docs.forEach(d => { if (!d._id) d._id = new ObjectId(); });
        if (!store[this.name]) store[this.name] = [];
        store[this.name].push(...docs);
        return { insertedIds: docs.map(d => d._id) };
    }

    async updateOne(filter: any, update: any) {
        const item = await this.findOne(filter);
        if (item) {
            if (update.$set) {
                Object.keys(update.$set).forEach(key => {
                    if (key.includes('.')) {
                        const parts = key.split('.');
                        let current = item;
                        for (let i = 0; i < parts.length - 1; i++) {
                            if (!current[parts[i]]) current[parts[i]] = isNaN(Number(parts[i+1])) ? {} : [];
                            current = current[parts[i]];
                        }
                        current[parts[parts.length - 1]] = update.$set[key];
                    } else {
                        item[key] = update.$set[key];
                    }
                });
            }
            if (update.$inc) {
                Object.keys(update.$inc).forEach(key => {
                    item[key] = (item[key] || 0) + update.$inc[key];
                });
            }
            return { matchedCount: 1, modifiedCount: 1 };
        }
        return { matchedCount: 0, modifiedCount: 0 };
    }

    async aggregate(pipeline: any[]) {
        let result = [...(store[this.name] || [])];

        for (const stage of pipeline) {
            if (stage.$match) {
                result = result.filter(item => this._matches(item, stage.$match));
            }
            else if (stage.$lookup) {
                const { from, localField, foreignField, as } = stage.$lookup;
                const foreignCollection = store[from] || [];
                result = result.map(item => {
                    const matches = foreignCollection.filter(fItem => {
                        const lVal = item[localField];
                        const fVal = fItem[foreignField];
                        return lVal?.toString() === fVal?.toString();
                    });
                    return { ...item, [as]: matches };
                });
            }
            else if (stage.$unwind) {
                const path = (stage.$unwind.path || stage.$unwind).replace('$', '');
                const newResult: any[] = [];
                result.forEach(item => {
                    const arr = item[path];
                    if (Array.isArray(arr)) {
                        arr.forEach(subItem => {
                            newResult.push({ ...item, [path]: subItem });
                        });
                    } else if (stage.$unwind.preserveNullAndEmptyArrays) {
                        newResult.push(item);
                    }
                });
                result = newResult;
            }
            else if (stage.$addFields) {
                result = result.map(item => {
                    const newItem = { ...item, ...stage.$addFields };
                    if (stage.$addFields.priorityScore) {
                        if (item.priority === 'STAT') newItem.priorityScore = 1;
                        else if (item.priority === 'Routine') newItem.priorityScore = 3;
                        else newItem.priorityScore = 4;
                    }
                    return newItem;
                });
            }
            else if (stage.$sort) {
                const key = Object.keys(stage.$sort)[0];
                const order = stage.$sort[key];
                result.sort((a, b) => {
                    if (a[key] < b[key]) return -1 * order;
                    if (a[key] > b[key]) return 1 * order;
                    return 0;
                });
            }
            else if (stage.$limit) {
                result = result.slice(0, stage.$limit);
            }
        }

        return {
            toArray: async () => result
        };
    }

    async countDocuments() { return (store[this.name] || []).length; }
    async deleteOne(filter: any) {
        const index = (store[this.name] || []).findIndex(item => this._matches(item, filter));
        if (index > -1) {
            store[this.name].splice(index, 1);
            return { deletedCount: 1 };
        }
        return { deletedCount: 0 };
    }
    async createIndex() { return; }
    async dropIndex() { return; }
    async indexes() { return []; }
    async findOneAndUpdate(filter: any, update: any, options: any) {
         let item = await this.findOne(filter);
         if (!item && options.upsert) {
             item = { _id: filter._id, sequence_value: 0 };
             if (!store[this.name]) store[this.name] = [];
             store[this.name].push(item);
         }
         if (item && update.$inc) {
             item.sequence_value = (item.sequence_value || 0) + update.$inc.sequence_value;
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
