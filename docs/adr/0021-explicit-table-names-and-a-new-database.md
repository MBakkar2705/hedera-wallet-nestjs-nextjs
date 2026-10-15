# ADR 0021: Explicit names for the tables, and a new database instead of a migration

- Status: Accepted
- Date: 2026-10-15

## Context

Item 17 of `docs/backend-evolutions.md` records that the names of the tables were not consistent. Facts that can be checked:

- Before this decision, the file `backend/hedera-wallet.db` of the author had six tables, read by the assistant in read-only mode on 2026-10-15: `accounts` (8 rows), `associations` (2), `tokens` (4), `topic_entity` (6), `message_entity` (8) and `token_transfer_entity` (1), 29 rows in all.
- In the code of the main branch, three entities had a plural name (`@Entity('accounts')`, `@Entity('associations')`, `@Entity('tokens')`), two had the name of the class in snake case (`@Entity('message_entity')`, `@Entity('token_transfer_entity')`), and `TopicEntity` had `@Entity()` without a name, so TypeORM named the table `topic_entity`.
- `AppModule` registers TypeORM with `synchronize: true`. From the documentation of TypeORM, this option creates the missing tables at startup and does not rename an existing one.
- The database is a local copy of what the backend did on Hedera (ADR 0002). The tokens, topics and messages of the file still exist on the testnet. The 8 accounts of the file also exist there; their private keys were stored in clear in the table `accounts` (ADR 0022).

The criteria used to choose:

- **One naming rule** for the six tables.
- **No tool to keep for a one-time change** on 29 rows.
- **Nothing lost that cannot be rebuilt**, or kept aside if the author wants it.
- **Provable** without the network.

## Decision

1. **The six tables are named in the plural, in snake case**: `accounts`, `associations`, `tokens` (unchanged), `topics`, `messages` and `token_transfers`. The three renamed ones get an explicit name: `@Entity('topics')`, `@Entity('messages')` and `@Entity('token_transfers')`. The classes keep their names.
2. **No migration and no SQL rename.** The author renamed the old file `backend/hedera-wallet.old.db` and the backend created a new one at startup. The rule `*.db` of `.gitignore` and `**/*.db` of `.dockerignore` cover the copy.
3. **A test keeps the names.** The end-to-end test reads `sqlite_master` of its throwaway database and requires exactly the six names.

## Alternatives considered

- **Keep the names.** Not chosen: the item exists because the rule was not the same for the six tables, and `topic_entity` is a class name that leaked into the schema.
- **A TypeORM migration** (`synchronize: false` and a migration that renames the three tables). Not chosen: it adds a tool and a way of working (generate, run, order the files) for 29 rows of a local copy. Not tried.
- **A SQL rename run once by the author** (`ALTER TABLE topic_entity RENAME TO topics`, and the same for the two others). Not chosen: it keeps the 29 rows, but it must be run by hand on each existing file and the repository would hold a script that is used once. Not tried.
- **A naming strategy of TypeORM that derives the names from the classes.** Not examined.

## Consequences

- A database file created before this decision keeps its old tables. From the documentation of TypeORM (not run here), the backend would create the three new tables next to them, and the old rows would not be read. The README says to rename or delete such a file.
- The pages `/tokens` and `/topics` read the local database only (items 5 and 14 of `docs/backend-evolutions.md`), so they list what was created after the change, not the 4 tokens, 6 topics and 8 messages of the old file.
- The 8 accounts of the old file stay on the testnet. Their keys are in the old copy only (ADR 0022).
- The names written in the README (`topic_entity`, `message_entity`, `TokenTranferEntity`) were out of date and are corrected. The README and ADR 0002 also named a table `transfer_entity`; no entity has that name in the code and the old file had no such table, so it is not a table of this application. HBAR transfers are not stored.

## Verification

### Proven

- Old file, read by the assistant in read-only mode (2026-10-15): the six tables and the row counts of the first point of "Context". The copy `hedera-wallet.old.db` has the same SHA256 as the original (`848b7ed80dec2d8418ff32e87d2b3fd250581e98bdd187faa656ca01c260a473`), an integrity check `ok` and the same counts. No value of the column `privateKey` was read.
- New file, read by the assistant in read-only mode after the first start (2026-10-15): `accounts`, `associations`, `messages`, `token_transfers`, `tokens` and `topics` (plus `sqlite_sequence`), with the columns of the entities, and no `topic_entity`, `message_entity` nor `token_transfer_entity`.
- `pnpm --filter backend test:e2e` runs 10 tests, all passing (observed by the author), among them the test that requires exactly the six names in a throwaway database, without the network.
- At the end of the lot, the new file held rows written by the application in each of the six tables, read back by the assistant in read-only mode: `accounts` 1 row, `associations` 1, `messages` 1, `token_transfers` 2, `tokens` 1, `topics` 1. The page `/tokens` listed only the new token `TST5` (the old file had 4), and the page `/topics` listed the new message `hello lot 7` of the topic `0.0.11038391` (observed by the author).
- No database file was ever committed: `git log --all -- '*.db'` prints nothing and `git ls-files` lists no `.db` file.
- The CI was green on the commit of this decision, `3bbbe91` (reported by the author).

### Not proven

- What `synchronize` does with an old file (new tables next to the old ones): from the documentation of TypeORM, not run.
- That the SQL rename or a migration would have kept the 29 rows without error: neither was tried.
- The container (`docker run`), which has never been run with real credentials (ADR 0007).
