"use client";

import { useState, type FormEvent } from "react";
import { ApiError, getErrorMessage } from "@/lib/api";
import {
  ACCOUNT_ID_PATTERN,
  createAccount,
  getAccount,
  type AccountInfo,
  type CreatedAccount,
} from "@/lib/accounts";
import { checkPrivateKey } from "@/lib/account-key";
import {
  INACTIVITY_LIMIT_MINUTES,
  useActiveAccount,
} from "@/lib/active-account";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { CodeValue } from "@/components/ui/CodeValue";
import { Field, Input } from "@/components/ui/Field";
import { PageHeader, Panel, PanelList } from "@/components/ui/Panel";

export default function AccountsPage() {
  const { activate } = useActiveAccount();

  // Create an account
  const [balanceInput, setBalanceInput] = useState("10");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedAccount | null>(null);

  // Look up an account
  const [accountIdInput, setAccountIdInput] = useState("");
  const [lookingUp, setLookingUp] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [info, setInfo] = useState<AccountInfo | null>(null);

  // Use an existing account
  const [activateIdInput, setActivateIdInput] = useState("");
  const [activateKeyInput, setActivateKeyInput] = useState("");
  const [activateError, setActivateError] = useState<string | null>(null);
  const [activating, setActivating] = useState(false);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const initialBalance = Number(balanceInput);
    if (
      balanceInput.trim() === "" ||
      !Number.isFinite(initialBalance) ||
      initialBalance < 0
    ) {
      setCreateError("Enter a number greater than or equal to 0.");
      return;
    }

    setCreating(true);
    setCreateError(null);
    setCreated(null);
    try {
      setCreated(await createAccount(initialBalance));
    } catch (error) {
      setCreateError(getErrorMessage(error));
    } finally {
      setCreating(false);
    }
  }

  async function handleLookup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const accountId = accountIdInput.trim();
    if (!ACCOUNT_ID_PATTERN.test(accountId)) {
      setLookupError("Enter an account ID like 0.0.123456.");
      return;
    }

    setLookingUp(true);
    setLookupError(null);
    setInfo(null);
    try {
      setInfo(await getAccount(accountId));
    } catch (error) {
      setLookupError(getErrorMessage(error));
    } finally {
      setLookingUp(false);
    }
  }

  async function handleActivate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const accountId = activateIdInput.trim();
    const privateKey = activateKeyInput.trim();
    if (!ACCOUNT_ID_PATTERN.test(accountId)) {
      setActivateError("Enter an account ID like 0.0.123456.");
      return;
    }
    if (privateKey === "") {
      setActivateError("Enter the private key of this account.");
      return;
    }

    setActivating(true);
    setActivateError(null);
    try {
      // The account must exist: the backend answers 404 for an unknown one.
      const info = await getAccount(accountId);

      // The key is checked here, in the browser: it is not sent for this.
      if (info.key === null) {
        setActivateError(
          "The key of this account is not a single key. This application signs with one key only.",
        );
        return;
      }
      const check = await checkPrivateKey(privateKey, info.key);
      if (check === "unreadable") {
        setActivateError(
          "The private key cannot be read. Enter its 64 hexadecimal characters, or its DER form.",
        );
        return;
      }
      if (check === "mismatch") {
        setActivateError("This private key does not belong to this account.");
        return;
      }

      activate({ accountId, privateKey });
      // The key must not stay in the form once it is in the active account.
      setActivateKeyInput("");
    } catch (error) {
      setActivateError(
        error instanceof ApiError && error.status === 404
          ? "This account does not exist on the Hedera testnet."
          : getErrorMessage(error),
      );
    } finally {
      setActivating(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-10 px-6 py-10">
      <PageHeader
        title="Accounts"
        description="Create a testnet account, look up an account, and choose the account that signs your transactions."
      />

      <PanelList>
        <Panel
          title="Create an account"
          description="A new testnet account with the initial balance you choose."
        >
          <form onSubmit={handleCreate} className="flex flex-col gap-4">
            <Field label="Initial balance (HBAR)">
              <Input
                value={balanceInput}
                onChange={(event) => setBalanceInput(event.target.value)}
                inputMode="decimal"
              />
            </Field>
            <Button type="submit" disabled={creating}>
              {creating ? "Creating..." : "Create account"}
            </Button>
          </form>

          {createError && <Callout tone="danger">{createError}</Callout>}

          {created && (
            <Callout tone="success">
              <p>
                Account <strong>{created.accountId}</strong> created with{" "}
                {created.initialBalance} HBAR.
              </p>
              <CodeValue label="Public key" value={created.publicKey} />
              <CodeValue
                label="Private key (testnet only)"
                value={created.privateKey}
                warning="Copying puts the key in the clipboard, which other programs and the Windows clipboard history can read."
              />
              <p className="text-sm text-muted">
                The key is kept in this page&apos;s memory only. It is lost when
                you reload or hide it.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={() =>
                    activate({
                      accountId: created.accountId,
                      privateKey: created.privateKey,
                    })
                  }
                >
                  Use this account
                </Button>
                <Button variant="quiet" onClick={() => setCreated(null)}>
                  Hide the keys
                </Button>
              </div>
            </Callout>
          )}
        </Panel>

        <Panel
          title="Look up an account"
          description="Shows the HBAR balance and the associated tokens with their balance."
        >
          <form onSubmit={handleLookup} className="flex flex-col gap-4">
            <Field label="Account ID">
              <Input
                value={accountIdInput}
                onChange={(event) => setAccountIdInput(event.target.value)}
                placeholder="0.0.123456"
              />
            </Field>
            <Button type="submit" disabled={lookingUp}>
              {lookingUp ? "Searching..." : "Get info"}
            </Button>
          </form>

          {lookupError && <Callout tone="danger">{lookupError}</Callout>}

          {info && (
            <Callout tone="info">
              <p>
                Account <strong>{info.accountId}</strong>
              </p>
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
                <dt className="text-muted">Balance</dt>
                <dd className="font-medium tabular-nums">{info.hbarBalance}</dd>
                <dt className="text-muted">Token associations</dt>
                <dd className="font-medium tabular-nums">
                  {info.tokens.length}
                </dd>
              </dl>
              {info.key ? (
                <CodeValue
                  label={`Public key (${info.key.type})`}
                  value={info.key.publicKey}
                />
              ) : (
                <p className="text-sm text-muted">
                  The key of this account is not a single key.
                </p>
              )}
              {info.tokens.length > 0 && (
                <ul className="max-h-64 divide-y divide-line overflow-y-auto">
                  {info.tokens.map((token) => (
                    <li
                      key={token.tokenId}
                      className="flex items-baseline justify-between gap-4 py-1.5"
                    >
                      <span>
                        <strong>{token.symbol}</strong>{" "}
                        <span className="text-sm text-muted">
                          {token.tokenId}
                        </span>
                      </span>
                      <span className="font-medium tabular-nums">
                        {token.balance}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Callout>
          )}
        </Panel>

        <Panel
          title="Use an existing account"
          description={`Kept in memory only. Forgotten when you click Forget, after ${INACTIVITY_LIMIT_MINUTES} minutes without a click or key press, or when you reload the page.`}
        >
          <form onSubmit={handleActivate} className="flex flex-col gap-4">
            <Field label="Account ID">
              <Input
                value={activateIdInput}
                onChange={(event) => setActivateIdInput(event.target.value)}
                placeholder="0.0.123456"
              />
            </Field>
            <Field label="Private key (testnet only)">
              {/* Not type="password": the browser would offer to save the key
                  in its password manager. The characters are hidden with CSS. */}
              <Input
                className="[-webkit-text-security:disc]"
                type="text"
                autoComplete="off"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                value={activateKeyInput}
                onChange={(event) => setActivateKeyInput(event.target.value)}
              />
            </Field>
            <Button type="submit" disabled={activating}>
              {activating ? "Checking..." : "Use this account"}
            </Button>
          </form>

          {activateError && <Callout tone="danger">{activateError}</Callout>}
        </Panel>
      </PanelList>
    </main>
  );
}
