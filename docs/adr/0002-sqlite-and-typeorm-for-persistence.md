# ADR 0002: SQLite and TypeORM for persistence

- Status: Accepted
- Date: 2026-10-09
- Note (2026-10-15): The tables were renamed (ADR 0021): `topics`, `messages` and `token_transfers` replace `topic_entity`, `message_entity` and `token_transfer_entity`, and the table `accounts` no longer has a column `privateKey` (ADR 0022). The first item of "Proven" is out of date: `transfer_entity` is not a table of this application (no entity has that name in the code, and the file of the author, read by the assistant in read-only mode on 2026-10-15, had no such table). That file had `accounts`, `associations`, `tokens`, `topic_entity`, `message_entity` and `token_transfer_entity`. Observed on 2026-10-15 (ADR 0021): the new file has `accounts`, `associations`, `messages`, `token_transfers`, `tokens` and `topics`, and the application wrote rows in each of them.

## Context

The backend keeps a local copy of what it does on Hedera: the accounts it creates, the tokens and their associations, the token transfers, and the topics with their messages. These are linked records: a token is associated with an account, a message belongs to a topic.

The criteria used to choose the storage:

- **No infrastructure:** the demo must run from a clone of the repository, without installing or starting a database server.
- **NestJS integration:** an official, documented integration with NestJS, including in unit tests.
- **TypeScript support:** the data model written as typed classes, in the same language as the rest of the backend.
- **Ecosystem maturity:** a widely used, maintained library.
- **Fit with the data:** relational data, with links between records.

## Decision

The data is stored in SQLite, in one local file `hedera-wallet.db`, accessed through TypeORM with `@nestjs/typeorm`.

How it meets the criteria:

1. **No infrastructure.** SQLite is a file, created automatically when the backend starts. There is nothing to install or start besides the `sqlite3` package.
2. **NestJS integration.** `TypeOrmModule.forRoot` configures the connection once in `AppModule`, and each module declares its entities with `TypeOrmModule.forFeature`. Services receive their repositories by injection (`@InjectRepository`), so a test can replace them.
3. **TypeScript.** Each table is an entity class with decorators, in the `entities/` folder of its module (accounts, tokens, topics).
4. **Maturity.** TypeORM is the ORM documented by NestJS, with an official package.
5. **Relational data.** Accounts, tokens, associations, transfers, topics and messages are tables with links, which SQLite and TypeORM handle natively.
6. **Schema.** `synchronize: true` creates and updates the tables from the entity classes, so there is no SQL script to maintain during development.

## Alternatives considered

- **PostgreSQL or MySQL.** Rejected on the no-infrastructure criterion. They need a database server to install or run (for example in a container), which is more than a demo needs. They fit the data model, and TypeORM can target them by changing the connection settings.
- **MongoDB.** Rejected on the fit-with-the-data criterion. The records are linked (token, association, account; topic, message), not independent documents, and there is no need for a flexible schema.
- **Prisma.** Rejected on the NestJS integration and TypeScript criteria. Prisma needs a separate schema file and a generated client, next to the TypeScript classes, and NestJS has an official package for TypeORM.

## Consequences

- The data is local to one file and one backend process. There is nothing to share between several instances.
- The path of the file is relative (`database: 'hedera-wallet.db'`), so the file is created in the folder the backend is started from (see ADR 0012).
- `synchronize: true` changes the tables when the entities change. It is convenient in development, and the TypeORM documentation advises against it on production data. Migrations would be needed there.
- Moving to another database server would mostly mean changing the connection settings and the driver, according to the TypeORM documentation.

## Verification

### Proven

- `backend/package.json` declares `typeorm`, `@nestjs/typeorm` and `sqlite3`.
- `backend/src/app.module.ts` configures `TypeOrmModule.forRoot` with `type: 'sqlite'`, `database: 'hedera-wallet.db'`, `autoLoadEntities: true` and `synchronize: true`.
- The modules `accounts`, `tokens` and `topics` each declare their entities with `TypeOrmModule.forFeature`, and their services receive repositories with `@InjectRepository`.
- The database file is created when the backend starts, and the tables were inspected in VS Code: `accounts`, `transfer_entity`, `message_entity` (reported by the author, see the README sections on SQLite persistence).

### Not proven

- That the backend works with PostgreSQL or MySQL by changing the connection settings: stated by the TypeORM documentation, not tried here.
- The behavior with several processes or with a large volume of data: not tested.
