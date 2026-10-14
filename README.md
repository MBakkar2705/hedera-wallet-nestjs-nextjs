# Hedera Minimalist Wallet

## Table of contents

- [Description](#description)
- [Tech Stack](#tech-stack)
- [Features & Progress](#features--progress)
- [Backend Progress Details](#backend-progress-details)
- [Project Structure](#project-structure)
- [Local Persistence (SQLite)](#local-persistence-sqlite)
- [Prerequisites](#prerequisites)
- [Environment Variables](#environment-variables)
- [Frontend](#frontend)
- [Setup Instructions](#setup-instructions)
- [curl.exe Quick Reference (Windows CMD)](#curlexe-quick-reference-windows-cmd)
- [Running Tests](#running-tests)
- [Swagger Access](#swagger-access)
- [Docker and CI](#docker-and-ci)
- [Backend evolutions](#backend-evolutions)
- [Architecture Decision Records](#architecture-decision-records)
- [Notes](#notes)
- [Author](#author)

## Description

This repository is a minimal wallet for the Hedera testnet. A REST API built with NestJS and TypeScript (the backend) provides account creation, HBAR transfers, token issuance and association, HTS token transfers, and HCS topic messaging. A Next.js application (the frontend) uses this API through four screens: accounts, transfer, tokens and topics.

All operations are executed via Hedera’s SDK and persisted locally using SQLite. The API is fully documented with Swagger and tested in isolation using Jest. The frontend is checked by lint, build and by hand in a browser. Everything targets the Hedera testnet: use testnet accounts only.

Main features:

- Hedera account management
- HBAR transfers
- Token creation and association
- Token transfers
- Topic creation and messaging via Hedera Consensus Service
- A web interface for these operations (accounts, transfer, tokens, topics)

Repository layout: the NestJS backend is in `backend/` and the Next.js frontend is in `frontend/`. Both are members of one pnpm workspace: `pnpm-workspace.yaml`, `pnpm-lock.yaml` and a minimal `package.json` are at the repository root. See [ADR 0012](docs/adr/0012-backend-and-frontend-in-sibling-folders.md).

---

## Tech Stack

Both applications:

- TypeScript
- pnpm (package manager, one workspace)

Backend:

- NestJS (backend framework)
- @hashgraph/sdk (Hedera SDK)
- SQLite (local data storage)
- Jest (unit testing)
- Supertest (end-to-end test)
- ESLint 9 and Prettier (lint and format)
- Swagger (API documentation)

Frontend:

- Next.js 16.4.0 (App Router, Turbopack)
- React 19.3.0
- Tailwind CSS 4
- ESLint 9

---

## Features & Progress

| Feature                                         | Status      |
|-------------------------------------------------|-------------|
| NestJS project initialization                   | Done        |
| Structure folders: accounts, tokens, topics     | Done        |
| Hedera account creation                         | Done        |
| Account info & balance retrieval                | Done        |
| HBAR transfer                                   | Done        |
| Fungible token creation                         | Done        |
| Token association                               | Done        |
| Token transfer                                  | Done        |
| Topic creation (HCS)                            | Done        |
| Topic message publication                       | Done        |
| Topic message retrieval                         | Done        |
| Unit tests with Jest                            | Done        |
| Swagger documentation generation                | Done        |
| README completion                               | Done        |
| Frontend: accounts screen                       | Done        |
| Frontend: HBAR transfer screen                  | Done        |
| Frontend: tokens screen                         | Done        |
| Frontend: topics screen                         | Done        |
| Frontend: design (Tailwind, local components)   | Done        |
| Backend and frontend in sibling folders         | Done        |
| Backend lint and format (ESLint, Prettier)      | Done        |
| Backend end-to-end test (supertest)             | Done        |
| CI: backend tests, lint, format check, e2e and build; frontend lint and build | Done        |

---

## Backend Progress Details

The steps below describe the backend. They keep the paths they had when each step was done. Since the reorganization described in [ADR 0012](docs/adr/0012-backend-and-frontend-in-sibling-folders.md), `src/`, `test/` and the configuration files of the backend are in `backend/`, and the files `.env` and `hedera-wallet.db` are `backend/.env` and `backend/hedera-wallet.db`. The commands `pnpm run start` and `pnpm run test` still work from the repository root.

### Step 1 - Initialization of the NestJS project

Project initialization included scaffolding via pnpm and the NestJS CLI, generating the standard directory structure (src/,tsconfig.json,package.json, etc.). In src/main.ts, the listener call was modified from  

await app.listen(process.env.PORT ?? 3000);

to

await app.listen(3000, '0.0.0.0');

to force listening on all interfaces. The server was started with

pnpm run start

and the root endpoint was verified in Microsoft Edge at http://localhost:3000, returning Hello World!, confirming a working NestJS Baseline

---

### Step 2 - Structure folders

--- 
### Step 2.1 – Structuring the Accounts Module

We generated an accounts module, controller and service via the Nest CLI.  

A CreateAccountDto was created to type incoming payloads.  

In AccountsService, we implemented `createAccount`, leveraging @hashgraph/sdk to:

- generate a key pair,
- send an AccountCreateTransaction with the given initialBalance,
- retrieve the receipt and return { accountId, publicKey, privateKey, initialBalance }.  

We exposed this logic through a POST /accounts endpoint in AccountsController.  
Environment variables are loaded from .env using dotenv/config.  
A final curl test confirmed the JSON response with the four expected fields.

---

### Step 2.2 – Structuring the Tokens Module

We generated the tokens module, service, and controller via the Nest CLI:

- pnpm exec nest generate module tokens
- pnpm exec nest generate service tokens --no-spec
- pnpm exec nest generate controller tokens --no-spec

The src/tokens directory now contains tokens.module.ts, tokens.service.ts, and tokens.controller.ts, establishing the basic structure for future HTS token endpoints.

We added a CreateTokenDto to type POST /tokens requests, with name, symbol, and initialSupply, validated via class-validator.
The createToken() method in TokensService uses Hedera’s SDK to send a TokenCreateTransaction and return { tokenId, name, symbol, initialSupply }.
Validation and injection are wired into the controller via NestJS decorators.

---

### Step 2.3 – Structuring the Topics Module

We generated the topics module, service, and controller via the Nest CLI:

- pnpm exec nest generate module topics
- pnpm exec nest generate service topics --no-spec
- pnpm exec nest generate controller topics --no-spec

The src/topics directory now contains topics.module.ts, topics.service.ts, and topics.controller.ts, setting up the foundation for future HCS topic endpoints.

Two DTOs were created in src/topics/dto:

- CreateTopicDto: optional memo: string for topic creation
- SendMessageDto: required message: string for publishing content
	
---

### Step 3 Account Creation (POST /accounts)

This endpoint creates a new Hedera account with an initial HBAR balance.

Controller definition:

@Post()
create(@Body() dto: CreateAccountDto) {
  return this.accountsService.createAccount(dto);
}

Service logic:

- Uses the Hedera SDK to create an AccountCreateTransaction
- Specifies the initial balance and network parameters
- Signs the transaction with a generated private key
- Executes the transaction and retrieves the receipt

- Returns:

	- accountId
	- publicKey
	- privateKey
	- initialBalance

Required DTO fields:

- initialBalance: number (≥ 0)

Test command:

curl.exe -X POST http://localhost:3000/accounts -H "Content-Type: application/json" -d "{\"initialBalance\":10}"

Sample response:

{
  "accountId": "0.0.6372035",
  "publicKey": "302a3005...c402c55",
  "privateKey": "302e0201...fc705d2e0",
  "initialBalance": 10
}

Outcome:

A new Hedera account was successfully created with an initial balance of 10 HBAR.
The account credentials (ID + key pair) are returned and persisted locally in the SQLite Database.

- Stored via the AccountEntity in hedera-wallet.db
- Inspected visually in the hedera-wallet.db on Visual Code : table accounts

---

### Step 4 – Account Info & Balance Retrieval (GET /accounts/:accountId)

This endpoint retrieves the current HBAR balance and the token associations of a Hedera account.

Controller definition:

@Get(':accountId')
getAccountInfo(@Param('accountId') accountId: string) {
  return this.accountsService.getAccountInfo(accountId);
}

Service logic:

- Uses the Hedera SDK to:

	- Build an AccountInfoQuery
	- Set accountId as the target
	- Execute the query on the testnet

- Parses and returns:

	- accountId
	- hbarBalance
	- tokenAssociations (list of token IDs, kept for compatibility)
	- balance (hbar and tinybars, two exact decimal strings)
	- tokens (tokenId, symbol and balance of each associated token)
	
Test command:

curl.exe http://localhost:3000/accounts/0.0.10936687

Sample response:

{
  "accountId": "0.0.10936687",
  "hbarBalance": "1 ℏ",
  "tokenAssociations": []
}

Outcome:

The account information for 0.0.10936687 was successfully retrieved.
The HBAR balance reflects the latest state on the Hedera testnet
Since 2026-10-13 the response also contains `balance` and `tokens`; the fields `hbarBalance` and `tokenAssociations` are kept for compatibility, see [ADR 0015](docs/adr/0015-structured-amounts-and-token-balances.md). Sample response, observed with curl and with Swagger on an account that has 285 token associations (the account ID is replaced by an example, and the two lists are shortened to two entries):

{
  "accountId": "0.0.1234567",
  "hbarBalance": "933.15364179 ℏ",
  "tokenAssociations": ["0.0.10952325", "0.0.10951658"],
  "balance": { "hbar": "933.15364179", "tinybars": "93315364179" },
  "tokens": [
    { "tokenId": "0.0.10952325", "symbol": "TST2", "balance": "1000" },
    { "tokenId": "0.0.10951658", "symbol": "TST", "balance": "990" }
  ]
}

In the real answer, `tokens` and `tokenAssociations` both had 285 entries in the same order, and 285 is also the number of associations given by the public Hedera mirror node for this account. A token balance is in the smallest unit of the token: its decimals are not part of the response. The page `/accounts` of the frontend lists the tokens with their symbol, ID and balance.

An unknown account ID returns HTTP 404 (`{"message":"Hedera does not know this account (INVALID_ACCOUNT_ID)","error":"Not Found","statusCode":404}`) and a malformed ID such as `abc` returns HTTP 400 (`failed to parse entity id: abc`). Both were observed with curl, see [ADR 0014](docs/adr/0014-global-filter-for-hedera-errors.md). Before that change, both returned HTTP 500 with the message "Internal server error".

This retrieval does not create a new row in SQLite, but can be cross-checked against existing entries in hedera-wallet.db

---

### Step 5 HBAR Transfer (POST /accounts/transfer)

This endpoint transfers HBAR from one Hedera account to another.

Controller definition:

@Post('transfer')
transfer(@Body() dto: TransferHbarDto) {
  return this.accountsService.transferHbar(dto);
}

Service logic:

- Uses the Hedera SDK to create a TransferTransaction
- Debits the sender account (fromAccountId)
- Credits the recipient (toAccountId)
- Signs the transaction with the sender’s private key
- Executes the transaction and retrieves the receipt
- Returns:
	- status
	- transactionId
	- from
	- to
	- amount (formatted text, kept for compatibility)
	- value (the amount as a number)
	- unit ("HBAR")

Required DTO fields:

- fromAccountId: string
- fromPrivateKey: string
- toAccountId: string
- amount: number (≥ 1)

Test command:

curl.exe -X POST http://localhost:3000/accounts/transfer -H "Content-Type: application/json" -d "{\"fromAccountId\":\"0.0.10937780\",\"fromPrivateKey\":\"<private key>\",\"toAccountId\":\"0.0.10937901\",\"amount\":1}"

Sample response:

{
  "status": "SUCCESS",
  "transactionId": "0.0.10937780@1791480449.935752603",
  "from": "0.0.10937780",
  "to": "0.0.10937901",
  "amount": "1 ℏ"
}

Outcome:

1 HBAR was successfully transferred from account 0.0.10937780 to account 0.0.10937901. The values above are the ones displayed by the frontend transfer screen, and the balance of the recipient went from 1 to 2 HBAR.
The transaction was finalized on the Hedera testnet and logged in the TransferEntity table in hedera-wallet.db
It can be inspected via VS Code SQLite Viewer in the transfer_entity table

Since 2026-10-13 the response also contains `value` and `unit`, next to `amount`, see [ADR 0015](docs/adr/0015-structured-amounts-and-token-balances.md). Observed through Swagger on the running backend with a transfer of 1 HBAR (the account IDs and the transaction ID are replaced by examples): HTTP 201 (Swagger documented 200 before, and showed this 201 as undocumented; the documentation now says 201) and

{
  "status": "SUCCESS",
  "transactionId": "0.0.1234567@1791882710.348380748",
  "from": "0.0.1234567",
  "to": "0.0.7654321",
  "amount": "1 ℏ",
  "value": 1,
  "unit": "HBAR"
}

Invalid request: a body that fails the validation, for example `{}`, returns HTTP 400 with the list of the invalid fields (observed with curl on 2026-10-12: five messages, including "amount must not be less than 1"). Before, the same request returned HTTP 500. The validation is applied by a global ValidationPipe, see [ADR 0014](docs/adr/0014-global-filter-for-hedera-errors.md).

---

### Step 6 Token Creation (POST /tokens)

This endpoint creates a new fungible HTS token on the Hedera testnet.

Controller definition:

@Post()
create(@Body() dto: CreateTokenDto) {
  return this.tokensService.createToken(dto);
}

Service logic:

- Uses the Hedera SDK to create a TokenCreateTransaction
- Sets token metadata:
	- name, symbol, initialSupply, decimals, adminKey, etc.
- Signs the transaction with the operator key
- Executes the transaction and retrieves the receipt
- Returns:

	- tokenId
	- name
	- symbol
	- initialSupply

Required DTO fields:
- name: string
- symbol: string
- initialSupply: number (≥ 0)

Test command:

curl.exe -X POST http://localhost:3000/tokens -H "Content-Type: application/json" -d "{\"name\":\"MyToken\",\"symbol\":\"MTK\",\"initialSupply\":1000}"

Sample respnse:

{
  "tokenId": "0.0.6371281",
  "name": "MyToken",
  "symbol": "MTK",
  "initialSupply": 1000
}

Outcome:

A new HTS token MTK was successfully created on the Hedera testnet.
Its assigned token ID is 0.0.6371281 and the initial supply is allocated to the treasury account.
It´s stored in the SQLite database via TokenEntity and inspectable in VS Code in table tokens

List of the tokens created here (GET /tokens): since 2026-10-13 the table `tokens` can be read. `GET /tokens` returns the tokens saved by this backend (not all the tokens of Hedera), newest first, one page at a time. The query parameters are `page` (a whole number from 1, default 1) and `limit` (a whole number from 1 to 100, default 20). See [ADR 0016](docs/adr/0016-paginated-list-of-the-tokens.md).

Test command:

curl.exe "http://localhost:3000/tokens?page=1&limit=2"

Sample response (observed on 2026-10-13, when the local database held 2 tokens):

{
  "items": [
    { "tokenId": "0.0.10952325", "name": "TestToken2", "symbol": "TST2", "initialSupply": 1000, "createdAt": "2026-10-09T09:23:32.000Z" },
    { "tokenId": "0.0.10951658", "name": "TestToken", "symbol": "TST", "initialSupply": 1000, "createdAt": "2026-10-09T08:28:50.000Z" }
  ],
  "page": 1,
  "limit": 2,
  "total": 2
}

Outcome:

With `limit=1`, page 1 returned TST2, page 2 returned TST and page 3 returned an empty list, with `total` 2 (observed with curl). `limit=500`, `page=0` and `page=abc` returned HTTP 400 with the validation messages. The page `/tokens` of the frontend lists the tokens 10 per page, with Previous and Next, and the list is updated by itself after a token is created (observed with 2 then 3 tokens; the buttons were not tried with more than one page).

---

### Step 7 Token association 

This endpoint allows a Hedera account to associate itself with a specific HTS token.
Association is required before the account can receive or hold the token.

Controller definition:

@Post('associate')
associate(@Body() dto: AssociateTokenDto) {
  return this.tokensService.associateToken(dto);
}

Service logic:

- Uses the Hedera SDK to create a TokenAssociateTransaction
- Sets the target accountId and tokenId
- Signs the transaction with the private key of the target account
- Executes the transaction and retrieves the receipt
- Returns:

	- status
	- accountId
	- tokenId

Required DTO fields:

- accountId: string
- privateKey: string
- tokenId: string

Test command:

curl.exe -X POST http://localhost:3000/tokens/associate -H "Content-Type: application/json" -d "{\"accountId\":\"0.0.6372035\",\"privateKey\":\"302e0200506032b......d2e0\",\"tokenId\":\"0.0.6371281\"}"

Sample response:

{
  "status": "SUCCESS",
  "accountId": "0.0.6372035",
  "tokenId": "0.0.6371281"
}

Outcome:

The token 0.0.6371281 was successfully associated with account 0.0.6372035.
The account is now eligible to receive and hold this token.

---

### Step 8 Transfer HTS Tokens (POST /tokens/transfer)

This endpoint transfers a specified amount of a fungible HTS token from one account to another.

Controller definition:

@Post('transfer')
transfer(@Body() dto: TransferTokenDto) {
  return this.tokensService.transferToken(dto);
}

Service logic:

- Uses the Hedera SDK to create a TransferTransaction
- Debits the sender account and credits the recipient
- Signs the transaction with the sender’s private key
- Executes the transaction and retrieves the receipt
- Returns:

	- status
	- transactionId
	- from
	- to
	- tokenId
	- amount

Required DTO fields:

- fromAccountId: string
- fromPrivateKey: string
- toAccountId: string
- tokenId: string
- amount: number (≥ 0)

Test command:

curl.exe -X POST http://localhost:3000/tokens/transfer -H "Content-Type: application/json" -d "{\"fromAccountId\":\"0.0.6106565\",\"fromPrivateKey\":\"302e020100300506032b657004220420e7eb4d09...ac74\",\"toAccountId\":\"0.0.6372035\",\"tokenId\":\"0.0.6371281\",\"amount\":100}"

Sample response:

{
  "status": "SUCCESS",
  "transactionId": "0.0.6106565@1752834587.930207316",
  "from": "0.0.6106565",
  "to": "0.0.6372035",
  "tokenId": "0.0.6371281",
  "amount": 100
}

Outcome:

The token 0.0.6371281 was successfully transferred from account 0.0.6106565 to account 0.0.6372035.
The transaction was accepted and finalized on the Hedera testnet.

The transfer is executed on-chain via Hedera’s testnet, and simultaneously persisted in SQLite via TokenTransferEntity.
Each transaction stores: fromAccountId, toAccountId, tokenId, amount, transactionId, and createdAt.
Verification performed manually in VS Code confirms the row’s presence

---

### Step 9 Topic Creation (POST /topics)

This endpoint creates a new HCS topic on the Hedera testnet, optionally setting a memo, and persists its ID and memo in SQLite.

Controller definition :

@Post()
create(@Body() dto: CreateTopicDto) {
  return this.topicsService.createTopic(dto);
}

Service logic

- Build a TopicCreateTransaction via Hedera SDK
- If provided, set the memo from the DTO
- Execute the transaction and retrieve the receipt
- Extract the topicId
- Save a new TopicEntity (with topicId and memo) in SQLite
- Return { topicId, memo }

Required DTO fields

- memo?: string

Test command:

curl.exe -X POST http://localhost:3000/topics \
  -H "Content-Type: application/json" \
  -d '{"memo":"Project updates"}'

Sample response:

{
  "topicId": "0.0.6381812",
  "memo": "Project updates"
}

Outcome:

A new HCS topic is created on Hedera testnet and persisted in the topic_entity table which is viewable in VS Code’s SQLite Viewer.

---

### Step 10 - Topic Message Publication (POST /topics/:topicId/messages)

This endpoint sends a message to an existing Hedera Consensus Service (HCS) topic and stores a copy in the local SQLite database.

Controller definition:

@Post(':topicId/messages')
sendMessage(@Param('topicId') topicId: string, @Body() dto: SendMessageDto) {
  return this.topicsService.sendMessage(topicId, dto);
}

Service logic:

- Validates the provided topicId
- Constructs a TopicMessageSubmitTransaction using Hedera SDK
- Submits the transaction to the testnet and retrieves the transactionId	
- Persists the message locally in MessageEntity via messageRepo.save
	- Stored fields: topicId, message, transactionId, createdAt

- Returns:

	- topicId
	- message
	- transactionId
	- createdAt

Required DTO fields

- message: string

Test command:

curl.exe -X POST http://localhost:3000/topics/0.0.6381812/messages -H "Content-Type: application/json" -d "{\"message\":\"message test\"}"

Sample response:

{
  "topicId": "0.0.6381812",
  "message": "message test",
  "transactionId": "0.0.6106565@1752946959.548320564",
  "createdAt": "2025-07-19T17:42:47.446Z"
}

Outcome: 

A message was successfully sent to Hedera topic 0.0.6381812, and a copy was stored in the message_entity table of the SQLite database (hedera-wallet.db), confirming persistence.

---

### Step 11 – Topic Message Retrieval (GET /topics/:topicId/messages)

This endpoint retrieves all messages previously submitted to a given Hedera Consensus Service (HCS) topic and stored in the local SQLite database.

Controller definition:

@Get(':topicId/messages')
getMessages(@Param('topicId') topicId: string): Promise<MessageEntity[]> {
  return this.topicsService.getMessages(topicId);
}

Service logic:

- Validates the provided topicId

- Queries the local SQLite database via messageRepo.find({ where: { topicId } })

- Returns an empty list (HTTP 200) when no message is stored for the topicId. The messages are read from the local database only, so a topic ID that is unknown or malformed gives an empty list too

- Returns an array of persisted MessageEntity objects

Returned fields per message:

- id

- topicId

- message

- transactionId

- createdAt

Test command:

curl.exe -X GET http://localhost:3000/topics/0.0.6850099/messages -H "accept: */*"

Sample response :

[
  {
    "id": 6,
    "topicId": "0.0.6850099",
    "message": "string",
    "transactionId": "0.0.6106565@1757930120.351338335",
    "createdAt": "2025-09-15T09:55:28.119Z"
  }
]

Outcome:

Messages previously submitted to Hedera topic 0.0.6850099 were successfully retrieved from the message_entity table in the SQLite database (hedera-wallet.db). This confirms both persistence and retrievability via public API.

Empty result: for a topic ID with no stored message (for example 0.0.9999999), the endpoint returns HTTP 200 with `[]`. This was observed with curl on 2026-10-12, and on the /topics page of the frontend, which shows "0 messages" and a short text. Before this change, the same request returned HTTP 500 with the message "Internal server error", and the page showed an error.

---

## Project Structure

This structure reflects the actual GitHub repository contents, excluding sensitive and build-specific artifacts

```plaintext
hedera-wallet-nestjs-nextjs\
├── backend/
│   ├── src/
│   │   ├── app.controller.ts
│   │   ├── app.module.ts
│   │   ├── app.service.ts
│   │   ├── app.controller.spec.ts
│   │   ├── main.ts
│   │   ├── accounts/
│   │   ├── tokens/
│   │   ├── topics/
│   │   └── hedera/
│   ├── test/
│   ├── Dockerfile
│   ├── .env.example
│   ├── .prettierrc
│   ├── eslint.config.mjs
│   ├── jest.config.js
│   ├── nest-cli.json
│   ├── package.json
│   ├── tsconfig.json
│   └── tsconfig.build.json
├── frontend/
├── docs/
├── .github/workflows/ci.yml
├── .dockerignore
├── .gitignore
├── CLAUDE.md
├── README.md
├── package.json
├── pnpm-lock.yaml
└── pnpm-workspace.yaml
```

---

## Local Persistence (SQLite)

This backend uses SQLite to persist Hedera-related entities locally.  
The database file hedera-wallet.db is automatically created in the folder the backend is started from. The path is read from the `DATABASE_PATH` variable (`backend/src/config.ts`) and defaults to the relative path `hedera-wallet.db`, so with `pnpm start` the file is `backend/hedera-wallet.db`.

---

### ORM: TypeORM  

Entities are defined using TypeORM decorators and synchronized on startup.

### Current Entities

| Entity               | Purpose                                                       |
|----------------------|----------------------------------------------------------------|
| AccountEntity        | Stores created Hedera accounts locally                        |
| TokenEntity          | Stores created HTS fungible tokens                            |
| AssociationEntity    | Tracks token associations per account                         |
| TransferEntity       | Logs native HBAR transfers                                    |
| TokenTransferEntity  | Persists HTS token transfers executed via API                 |
| TopicEntity          | Stores created HCS topics                                     |
| MessageEntity        | Stores messages published to HCS topics                       |

### Storage Location 
 
The database file is located at:  
backend/hedera-wallet.db

### Configuration  

Configured in app.module.ts using TypeOrmModule.forRoot() with:

{
  type: 'sqlite',
  database: 'hedera-wallet.db',
  entities: [AccountEntity],
  synchronize: true
}

Repository Injection:

Repositories are injected using @InjectRepository() in services.

Example:

After creating a Hedera account via the SDK, the account is stored locally:

await this.accountRepo.save({
  accountId: '0.0.123456',
  publicKey: '...',
  privateKey: '...',
  initialBalance: 1000
});

Development Verification (VS Code):

To inspect the database during development:

- Install the SQLite Viewer extension in VS Code.
- Right-click on hedera-wallet.db in the file explorer.
- Select "Open with SQLite Viewer".
- Browse the relevant table (accounts, tokens, topics, etc.) to confirm persisted rows.

Each row includes:

- Entity-specific fields (e.g. accountId, tokenId, topicId)
- Metadata (e.g. initialBalance, symbol, memo)
- CreatedAt 

This method applies to all future entities stored in SQLite

---

## Prerequisites

- Node.js >= 20.9 (required by the Next.js frontend)
- pnpm 10.11.0, the version pinned in `packageManager` (with Corepack: `corepack enable`, as in the Dockerfile)

---

## Environment Variables

Credentials are read from a `.env` file in the `backend/` folder (`dotenv` reads the file from the folder the backend is started from, which is `backend/` with `pnpm start`). Create it from the template and fill in your own Hedera testnet values:

copy backend\.env.example backend\.env

- `HEDERA_ACCOUNT_ID`, `HEDERA_PRIVATE_KEY`: the operator account, which pays the fees of what the backend sends: from the code, the lookups, the creation of accounts and tokens, and the transfers of HBAR. Observed: the lookups cost the operator about 0.00113 ℏ each (earlier lot), and for a transfer of HBAR on 2026-10-13 the transaction ID started with the operator account and the sender lost exactly the amount sent. They are read once, by `createHederaClient()` (`backend/src/hedera/hedera-client.ts`), and the client built from them is shared by the Hedera, accounts and tokens modules.

The application exits at startup, with `Missing environment variable(s): ...`, if one of the two is missing or empty. Observed (2026-10-13) with both absent; the cases with only one absent or with an empty value are covered by unit tests only. `OPERATOR_ID` and `OPERATOR_KEY`, read before [ADR 0017](docs/adr/0017-one-operator-account-and-one-shared-hedera-client.md), are no longer read: an older `.env` can keep them (the backend started with them present) or drop them (the backend started with them commented out); both observed. Use a testnet account only. See [ADR 0007](docs/adr/0007-environment-variables.md) and [ADR 0017](docs/adr/0017-one-operator-account-and-one-shared-hedera-client.md).

Two optional variables have a default and can be added to the same `.env` file:

- `CORS_ORIGIN`: the one origin allowed to call the API from a browser. Default: `http://localhost:3001`. An empty value gives the default.
- `PORT`: the port the API listens on. Default: `3000`. A value that is not an integer between 1 and 65535 stops the application at startup with `Invalid PORT "..."`.
- `DATABASE_PATH`: the SQLite file. Default: `hedera-wallet.db`, relative to the folder the backend is started from (`backend/` with `pnpm start`). An empty value gives the default.

Observed (2026-10-13): with `PORT=3005`, Swagger answered on `http://localhost:3005/api`; with `PORT=abc`, the backend printed `Invalid PORT "abc": expected an integer between 1 and 65535` and stopped. The frontend reads the API address from `NEXT_PUBLIC_API_URL` (`frontend/lib/api.ts`, default `http://localhost:3000`): it has to be set if `PORT` is changed. That was not tested.

Observed (2026-10-13): with the default `DATABASE_PATH`, the backend started and the Tokens page, which reads the tokens from the database, listed the 3 tokens created before. A value other than the default was used by the end-to-end test only, not on the running backend.

---

## Frontend

The frontend is a Next.js application in the `frontend/` folder. It is a member of the pnpm workspace (see `pnpm-workspace.yaml`): a single `pnpm install` at the repository root installs the backend and the frontend, with one `pnpm-lock.yaml` at the root. See [ADR 0008](docs/adr/0008-frontend-integration-in-the-repository.md).

Current state: first version complete. Four screens, tested by hand in a browser against the running backend: the accounts screen (`/accounts`) creates an account, looks up a balance and chooses the active account, the transfer screen (`/transfer`) sends HBAR from the active account, and the tokens screen (`/tokens`) creates a token, associates the active account with it and transfers tokens, and the topics screen (`/topics`) creates a topic, publishes a message and lists the messages of a topic. The account lookup shows the HBAR balance and the associated tokens with their symbol and balance, and the tokens screen lists the tokens created through the backend, 10 per page (both since 2026-10-13, see [ADR 0015](docs/adr/0015-structured-amounts-and-token-balances.md) and [ADR 0016](docs/adr/0016-paginated-list-of-the-tokens.md)). The messages of a topic come from the local database of the backend. Lint and build pass, locally and in the CI. Backend changes that would help the frontend are listed in [docs/backend-evolutions.md](docs/backend-evolutions.md).

Active account: to sign an operation, the user activates an account (account ID and private key) on `/accounts`. It is held in React state (`frontend/lib/active-account.tsx`), the top bar shows the account ID only, and the key is typed in a masked text field (not a password field, so that the browser does not offer to save it). It is forgotten when the user clicks Forget, after 5 minutes without a click or key press (checked by hand), or when the page is loaded again. See [ADR 0010](docs/adr/0010-active-account-in-memory.md). Tokens created by the backend are held by its operator account, so sending them requires activating that account with its key, typed in the form (Hedera testnet only, see [ADR 0009](docs/adr/0009-private-keys-in-the-frontend.md)).

Design: the colors are defined once in `frontend/app/globals.css` (Tailwind 4 tokens, indigo and violet, dark values defined but not displayed yet). The repeated parts of the interface are local components in `frontend/components/ui/` (`Button`, `Field`, `Panel`, `Callout`, `CodeValue`), and the header, the brand mark and the active account bar are in `frontend/components/`. The design uses Tailwind only, with no UI library. Keys and transaction values have a Copy button with a warning about the clipboard. See [ADR 0011](docs/adr/0011-design-system-tailwind-local-components.md).

The API address is defined in one place, `frontend/lib/api.ts` (variable `NEXT_PUBLIC_API_URL`, default `http://localhost:3000`).

Scripts defined in `frontend/package.json`: dev, build, start, lint.

Start the frontend from the repository root:

pnpm --filter frontend dev

The frontend runs on http://localhost:3001 and the backend on http://localhost:3000.

CORS: the backend allows a single origin, read from `CORS_ORIGIN` (default http://localhost:3001; read in `backend/src/config.ts`, applied by `backend/src/cors.ts`, called from `backend/src/main.ts`). The server puts that origin in `Access-Control-Allow-Origin` also when the request comes from another origin: it does not refuse the request, the browser blocks the page from reading the answer. Observed (2026-10-13): with curl, `Origin: http://other.example` got `Access-Control-Allow-Origin: http://localhost:3001`; with `CORS_ORIGIN=http://localhost:3002`, the accounts page on http://localhost:3001 showed "Cannot reach the API" and the browser console reported `blocked by CORS policy: The 'Access-Control-Allow-Origin' header has a value 'http://localhost:3002' that is not equal to the supplied origin`; with the default origin, the account lookup works from the frontend. Checked earlier, before the variable existed: the browser sent a preflight request (204) before the POST (201) from the accounts page. The end-to-end test checks the header and a preflight request answered with 204.

Private keys: some endpoints take a private key in the request body (Hedera testnet demo only). The frontend keeps keys in page memory only: never in localStorage, sessionStorage, cookies, URLs or logs. Signing with a wallet instead of sending a key is a possible evolution, not implemented: it would require changes in the backend (`backend/src/`) and in its tests. See [ADR 0009](docs/adr/0009-private-keys-in-the-frontend.md) and [ADR 0010](docs/adr/0010-active-account-in-memory.md).

---

## Setup Instructions

Create `backend/.env` first (see [Environment Variables](#environment-variables)), then, from the repository root:

pnpm install
pnpm run start

The backend listens on http://localhost:3000 (Swagger at http://localhost:3000/api). In a second terminal, start the frontend, which listens on http://localhost:3001:

pnpm --filter frontend dev

---

## curl.exe Quick Reference (Windows CMD)

GET requests:

curl.exe http://localhost:3000/accounts/0.0.6368522

POST requests (must specify method and headers):
curl.exe -X POST http://localhost:3000/accounts ^
  -H "Content-Type: application/json" ^
  -d "{\"initialBalance\":10}"

General syntax:

curl.exe -X <METHOD> <URL> -H "Content-Type: application/json" -d "<JSON payload>"

---

## Running Tests

Jest is configured for unit testing the backend modules (AccountsService, TokensService, TopicsService) using the NestJS testing tools.

Installation was done via pnpm:

pnpm add -D jest ts-jest @types/jest @nestjs/testing

pnpm exec ts-jest config:init

The generated file `backend/jest.config.js` serves as the base configuration.
Jest runs in TypeScript mode with auto-discovery of .spec.ts files.

Available commands:

pnpm run test       // Runs all test suites (from the repository root)

pnpm run test:cov   // Runs all tests and generates coverage report

The coverage report includes detailed metrics per file, function, branch, and line.
It is stored in the `coverage` folder of `backend/` (the Jest default, `coverage/lcov-report/index.html`) after execution.

Lint, format and end-to-end commands (from the repository root; the CI runs them with `pnpm --filter backend`):

pnpm --filter backend lint          // ESLint on backend/src and backend/test

pnpm --filter backend format:check  // Prettier check, no file modified

pnpm --filter backend format        // Prettier rewrites the files

pnpm --filter backend test:e2e      // End-to-end test

The end-to-end test is `backend/test/app.e2e-spec.ts`. It starts the application module, checks the response of `GET /`, checks the CORS header and a preflight request, and checks that two invalid request bodies and one invalid query (`GET /tokens?limit=500`) are refused with a 400 (the body or the query is checked before any call to Hedera). It sets throwaway Hedera credentials itself (a key generated at each run), so no `.env` file is needed to run it. It uses a throwaway database file in the temporary folder of the system (`DATABASE_PATH`, set at the start of the test and removed at the end; the removal was not checked by hand), so the test no longer opens `hedera-wallet.db`. Observed (2026-10-13): the last modification time of `backend/hedera-wallet.db` did not change after `pnpm test` and `pnpm --filter backend test:e2e`. The Hedera clients are closed when the application closes: without that, Jest did not exit (observed).

There is no frontend test script yet. The frontend is checked by `pnpm --filter frontend lint`, `pnpm --filter frontend build` and by hand in a browser. The CI runs the lint and the build.

Tests will be structured per service using .spec.ts files under `backend/src/`.
Coverage confirms execution paths for each feature listed

### Unit Testing - AppController

The file `backend/src/app.controller.spec.ts` validates the core routing and response behavior of the `AppController`.

Structure:

- Uses Jest’s `describe()` and `it()` blocks to verify basic controller responses
- Ensures that the controller is properly instantiated and returns expected values
- No external dependencies or SDK calls are involved

Error coverage :

- The controller is tested for correct instantiation and response formatting
- No conditional logic or exception handling is present in the controller itself
- The tests confirm that the controller behaves predictably under normal conditions

Execution :

pnpm run test

Outcome:

3 unit tests passed successfully. The controller is correctly wired and responds as expected, confirming the integrity of the application’s entry point

Coverage :

Jest coverage confirms full execution of app.controller.ts (100% statements, branches, functions, and lines). The file is fully tested in isolation, and all exposed routes are validated for expected behavior.


### Unit Testing – AccountsService

A dedicated file backend/src/accounts/accounts.service.spec.ts covers the main logic of the AccountsService independently from the Hedera SDK and SQLite.

Structure:

- Segmented using Jest’s describe() blocks per method:

	createAccount(), getAccountInfo(), and transferHbar()
- SDK calls are fully mocked via jest.mock('@hashgraph/sdk'), including Hbar, PrivateKey, AccountCreateTransaction, etc.
- No network or database dependency is required to run the tests

Error coverage:

- createAccount() throws if receipt.accountId is null → explicitly tested
- getAccountInfo() throws if the Hedera SDK fails → simulated and captured

Execution:

pnpm run test

Outcome: 

6 unit tests passed successfully. The service behavior is reproducible and stable in isolation. Only errors explicitly handled in code are covered.

Coverage:

Jest coverage confirms full execution of `accounts.service.ts` (100% statements, branches, functions, and lines).  
The service file is fully tested in isolation.

However, the file `account.entity.ts` shows partial coverage:  
- 90.9% statements  
- 100% branches  
- 0% functions  
- 88.88% lines  

This is due to the `createdAt` property, which is decorated with a default timestamp via TypeORM:  

@Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
createdAt: Date;

This partial coverage is acknowledged and will be addressed in future iterations.

### Unit Testing – TokensService

A dedicated file backend/src/tokens/tokens.service.spec.ts covers the full business logic of the TokensService, including creation, association, and transfer functionalities.

Structure:

- Segmented using Jest’s describe() blocks per method: createToken(), associateToken(), and transferToken()
- SDK calls are fully mocked via jest.mock('@hashgraph/sdk'), including TokenCreateTransaction, TokenAssociateTransaction, TransferTransaction, PrivateKey, etc.
- No network or database dependency is required to run the tests

Error coverage:

- createToken() throws if receipt.tokenId is null → explicitly tested
- associateToken() handles SDK error code 194 (token already associated) → simulated and validated
- Transfer paths are tested with mock status responses

Execution:

pnpm run test

Outcome: 

5 unit tests passed successfully. The service behavior is reproducible and stable in isolation. Only errors explicitly handled in code are covered.
The HTS token transfer via the API is also stored locally in SQLite via TokenTranferEntity table.

Coverage:

Jest reports near-full execution of tokens.service.ts: 100% statements, 100% branches, 100% functions, and 100% lines. All functional paths, conditional branches, and SDK responses are explicitly covered.

### Unit Testing – TopicsService

A dedicated file backend/src/topics/topics.service.spec.ts covers the main logic of the TopicsService, including topic creation, message publication and message retrieval, independently from the Hedera SDK and SQLite.

Structure:

- Segmented using Jest’s describe() blocks for each method: createTopic(), sendMessage() and getMessages()
- SDK calls are fully mocked via jest.mock('@hashgraph/sdk'), including TopicCreateTransaction, TopicMessageSubmitTransaction, TopicId.fromString(), and transactionId handling
- Repositories (topicRepo, messageRepo) are mocked via NestJS getRepositoryToken

Error coverage:

- createTopic() throws an error if receipt.topicId is null → explicitly tested and captured

- createTopic() handles conditional memo injection (branch line 30) → covered via dedicated test

- sendMessage() simulates message delivery and persistence with mocked receipt

- getMessages() returns an empty list if no message is found → tested with empty result

Execution:

pnpm run test

Outcome:

All 6 unit tests passed successfully. The TopicsService behaves deterministically and reproduces both success and error scenarios without external dependencies.

Coverage:

Jest reports full execution of topics.service.ts:
100% statements, 100% functions, 100% lines, and 100% branches.
All conditional paths, including memo injection and error handling, are explicitly covered. The service logic is stable, predictable, and thoroughly validated in isolation

### Unit Testing – HederaExceptionFilter

This suite starts a small Nest application whose routes only throw an error, and sends real HTTP requests to it. The Hedera error is a real `PrecheckStatusError` of the SDK. It checks that `INVALID_ACCOUNT_ID` gives 404, that `INSUFFICIENT_PAYER_BALANCE` and another Hedera status give 400, that a malformed ID gives 400, that an `HttpException` is unchanged and that an unexpected error stays a 500 without its message.

Execution:

pnpm run test

Outcome:

5 suites and 26 tests passed (reported by the author). See [ADR 0014](docs/adr/0014-global-filter-for-hedera-errors.md).

---

## Swagger Access

This step adds an interactive documentation layer to the backend API using Swagger.
All REST endpoints are now accessible via a browser-based interface at http://localhost:3000/api.

Integration:

- Installed required packages:

pnpm add @nestjs/swagger swagger-ui-express

- Configured main.ts:

import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

const app = await NestFactory.create(AppModule);

const config = new DocumentBuilder()
  .setTitle('Hedera Wallet API by M.Bakkar')
  .setDescription('Backend minimalist for Hedera wallet operations')
  .setVersion('1.0')
  .build();

const document = SwaggerModule.createDocument(app, config);

SwaggerModule.setup('api', app, document);

### Accounts Module Coverage:

The following endpoints — POST /accounts, GET /accounts/:accountId, and POST /accounts/transfer — are documented via Swagger with:

- @ApiTags('accounts') for logical grouping
- @ApiBody() and @ApiParam() decorators referencing:

	- CreateAccountDto (initialBalance)
	- TransferHbarDto (fromAccountId, fromPrivateKey, toAccountId, amount)
	- @ApiParam('accountId') for path variable in GET requests

- @ApiResponse() annotations aligned per route:

	- 201: success for account creation and HBAR transfer
	- 200: success for balance retrieval
	- 400: validation errors or Hedera SDK exceptions (e.g. invalid accountId, insufficient HBAR)

- DTO fields annotated with @ApiProperty() for Swagger schema generation

- Integrated with class-validator for runtime payload validation (@IsString(), @IsInt(), @Min(0))

All returned responses expose consistent fields:

- Creation: accountId, publicKey, privateKey, initialBalance
- Info retrieval: accountId, hbarBalance, tokenAssociations, balance, tokens
- HBAR transfer: status, transactionId, from, to, amount, value, unit

Outcome:

The Swagger interface presents a dedicated Accounts section accessible at:
http://localhost:3000/api

This section enables:

- Form-based interaction for creating accounts and sending HBAR
- Path-based queries for checking balance and status
- Runtime validation via DTO schemas and class-validator rules
- Backed by SQLite persistence in AccountEntity and TransferEntity

### Tokens Module Coverage:

The following endpoints — POST /tokens, GET /tokens, POST /tokens/associate, and POST /tokens/transfer — are documented via Swagger with:

- @ApiTags('tokens') for logical grouping
- @ApiBody() decorators referencing:	
	
	- CreateTokenDto (name, symbol, initialSupply)
	- AssociateTokenDto (accountId, privateKey, tokenId)
	- TransferTokenDto (fromAccountId, toAccountId, tokenId, amount)
	- ListTokensQueryDto (page, limit), for GET /tokens

- @ApiResponse() annotations aligned per route:

	- 201: success for creation, association, and transfer
	- 200: success for the list of tokens
	- 400: validation errors or Hedera SDK exceptions (e.g. insufficient token balance, invalid signatures)

- DTO fields annotated with @ApiProperty() for Swagger schema generation
- Integrated with class-validator for runtime payload validation (@IsString(), @IsInt(), @Min(1))

All returned responses expose consistent fields:

- Creation: tokenId, name, symbol, initialSupply
- Association: status, accountId, tokenId
- Transfer: status, transactionId, from, to, tokenId, amount
- List: items (tokenId, name, symbol, initialSupply, createdAt), page, limit, total

Outcome:

The Swagger interface provides a structured Tokens section accessible at:
http://localhost:3000/api

This section enables:


- Form-based testing for each token operation
- Runtime validation via DTO + validator annotations
- Schema traceability for all token actions
- Backed by SQLite persistence in TokenEntity and AssociationEntity (for creation and association)

### App Module Coverage:

The root route — GET / — exposed by AppController serves as a lightweight health check for the backend. It confirms that the NestJS server is running and responsive.

- Documented via Swagger with:

	- @ApiTags('app') for section visibility
	- @ApiOperation({ summary: 'Default API route – verifies backend is reachable' })
	- @ApiResponse({ status: 200, description: 'Returns confirmation string from backend' })

- Returns a static string: "Welcome to Hedera Wallet API by M. Bakkar"
- Does not interact with Hedera SDK or SQLite
- Useful for early-stage testing, container checks, or API monitoring

Outcome:

The Swagger interface includes a minimal "App" section for connectivity validation.
This route ensures that the backend is accessible before engaging with Hedera 

### Topics Module Coverage:

The following endpoints — POST /topics, POST /topics/:topicId/messages and GET /topics/:topicId/messages — are documented via Swagger with:

- @ApiTags('topics') for logical grouping
- @ApiBody() and @ApiParam() decorators referencing:

	- CreateTopicDto (optional memo field)
	- SendMessageDto (required message field)
	- @ApiParam('topicId') for dynamic path

- @ApiResponse() annotations aligned per route:

	- 200: success for message retrieval
  - 201: success for topic creation and message submission
	- 400: validation errors or SDK exceptions (e.g. invalid topicId)

- DTOs annotated with @ApiProperty() for Swagger schema generation
- Combined with class-validator decorators (@IsString(), @IsOptional()) for payload enforcement, applied by a global ValidationPipe (see the note of 2026-10-12 in [ADR 0014](docs/adr/0014-global-filter-for-hedera-errors.md))

All returned responses expose consistent fields:

- Topic creation: topicId, memo
- Message submission: topicId, message, transactionId, createdAt
- Message retrieval: array of MessageDto objects with topicId, message, createdAt

Outcome:

The Swagger interface provides a dedicated Topics section accessible at:
http://localhost:3000/api

This section enables:

- Form-based creation of HCS topics with optional metadata
- Submission of string messages to active topics via typed payloads
- Retrieval of topic messages via structured GET requests with optional limit
- Persistence confirmed locally via TopicEntity and MessageEntity
(visible in SQLite and verifiable during development)

---

## Docker and CI

A multi-stage Dockerfile (`backend/Dockerfile`) builds a production image of the backend (Node 22, pnpm via corepack, runs as non-root user). The lockfile and the workspace files are at the repository root, so the image is built from the repository root, with `-f` and the final dot (the build context):

docker build -f backend/Dockerfile -t hedera-wallet .

Credentials are not included in the image (`.env` files are excluded by `.dockerignore`).
Running the container requires the two operator variables described in [Environment Variables](#environment-variables), provided at runtime:

docker run --rm --init -p 3000:3000 --env-file backend/.env hedera-wallet

Without these variables, the application exits at startup. The `--init` option is needed for Ctrl+C to stop the container. Without it, Ctrl+C had no effect after about 30 seconds and `docker stop` took about 10 seconds; with it, Ctrl+C stopped the container in about 2 seconds (all observed). In the Nest log, the application is process 1 without `--init` and process 7 with it. The cause was not tested separately.

The GitHub Actions workflow (.github/workflows/ci.yml) installs dependencies with pnpm, runs the backend tests (`pnpm test`), the backend lint, the backend format check, the backend end-to-end test and the backend build, then the lint and the build of the frontend, on every push and pull request.

---

## Backend evolutions

The backend evolutions listed in [docs/backend-evolutions.md](docs/backend-evolutions.md) are made in lots: one branch, one pull request and one merge per lot. The table lists the lots merged into main.

| Lot               | What it changes                                                                                                                                                 | Items  | ADR                    |
|-------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------|--------|------------------------|
| Rules and tooling | Rules for the AI assistant, backend lint and Prettier format check, runnable end-to-end test, Hedera clients closed at shutdown, CI steps, `docker run --init` | 11, 15 | 0004, 0005, 0006, 0013 |
| Error handling    | Hedera errors become 404 and 400 through a global filter, empty topic answers 200, request bodies validated by a global ValidationPipe | 1, 2, 13, 20 | 0014 |
| Token responses   | Structured balances and token details next to the formatted fields of the account lookup, amount value and unit on transfers, paginated list of the tokens created by the backend | 3, 4, 5 | 0015, 0016 |
| Configuration     | CORS origin, port and database path read from environment variables, one operator account and one shared Hedera client (the operator pays every operation, HBAR transfers included), end-to-end test isolated from the local database | 9, 10, 24 | 0017 |
| Strict TypeScript | `strict: true` in the backend, with `!` on the 75 properties of the entities and DTO that a library fills; the CI builds the backend | 16, 25 | 0018 |

---

## Architecture Decision Records

Design decisions are recorded in `docs/adr/`, one file per decision, following the template [0000-template.md](docs/adr/0000-template.md). Each record has a Verification section that separates what was proven from what was not.

The records are numbered in the order of the project: first the backend, then the frontend and what goes with it.

**Backend**

- [ADR 0001: NestJS as the backend framework](docs/adr/0001-nestjs-as-backend-framework.md)
- [ADR 0002: SQLite and TypeORM for persistence](docs/adr/0002-sqlite-and-typeorm-for-persistence.md)
- [ADR 0003: Jest for the backend tests](docs/adr/0003-jest-for-backend-tests.md)
- [ADR 0004: Rules for the AI coding assistant](docs/adr/0004-ai-assistant-rules.md)
- [ADR 0005: A multi-stage Docker image for the backend](docs/adr/0005-docker-image-for-the-backend.md)
- [ADR 0006: Continuous integration with GitHub Actions](docs/adr/0006-github-actions-continuous-integration.md)
- [ADR 0007: Environment variables](docs/adr/0007-environment-variables.md)

**Frontend and repository layout**

- [ADR 0008: Frontend integration in the repository](docs/adr/0008-frontend-integration-in-the-repository.md)
- [ADR 0009: Private keys in the frontend](docs/adr/0009-private-keys-in-the-frontend.md)
- [ADR 0010: Active account held in memory](docs/adr/0010-active-account-in-memory.md)
- [ADR 0011: Design system with Tailwind tokens and local components](docs/adr/0011-design-system-tailwind-local-components.md)
- [ADR 0012: Backend and frontend in sibling folders](docs/adr/0012-backend-and-frontend-in-sibling-folders.md)

**Backend evolutions**

- [ADR 0013: Backend lint, format and end-to-end checks](docs/adr/0013-backend-lint-format-and-e2e-checks.md)
- [ADR 0014: A global filter that turns Hedera errors into HTTP responses](docs/adr/0014-global-filter-for-hedera-errors.md)
- [ADR 0015: Structured amounts and token balances next to the formatted fields](docs/adr/0015-structured-amounts-and-token-balances.md)
- [ADR 0016: A paginated list of the tokens created by the backend](docs/adr/0016-paginated-list-of-the-tokens.md)
- [ADR 0017: One operator account in the environment and one shared Hedera client](docs/adr/0017-one-operator-account-and-one-shared-hedera-client.md)
- [ADR 0018: TypeScript strict mode in the backend, with `!` on the properties filled by a library](docs/adr/0018-typescript-strict-mode-in-the-backend.md)

The records were renumbered to follow this order. Earlier commit messages use the former numbers: former 0001 is now 0009, 0002 is 0008, 0003 is 0007, 0005 is 0010, 0006 is 0011 and 0007 is 0012. The former 0008 to 0012 were never committed under those numbers. ADR 0004 keeps its number.

---

## Notes

- The frontend and the backend both run TypeScript in strict mode (`strict: true`). In the backend, the properties of the entities and of the request DTOs, which a library fills (TypeORM, the validation), are declared with `!` (see [ADR 0018](docs/adr/0018-typescript-strict-mode-in-the-backend.md)); a new class of this kind needs the same.
- Both applications are structured for testability.
- Backend: modules are isolated by responsibility (accounts, tokens, topics, etc.).
- Backend: SQLite is used for lightweight storage during development.
- Frontend: the API address is defined in one place, and no secret is put in the frontend code (see [ADR 0009](docs/adr/0009-private-keys-in-the-frontend.md)).

---

## Author

Developed by Mohamed Bakkar  

