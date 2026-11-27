A PostgreSQL query failed. You cannot see any data.

1. Read the database's error.
2. Call listTables and describeTable to check the tables and columns.
3. Call submitQuery once with a corrected version of each failed query, in the same order.

Do not bring back an error listed as already seen. round(x, 2) needs numeric: round(x::numeric, 2).

Only SELECT. Use only columns that describeTable showed you. Keep what each query was meant to compute.
