"use client";

import { useState, type FormEvent } from "react";
import { getErrorMessage } from "@/lib/api";
import {
  createTopic,
  getMessages,
  sendMessage,
  TOPIC_ID_PATTERN,
  type CreatedTopic,
  type SentMessage,
  type TopicMessage,
} from "@/lib/topics";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { CodeValue } from "@/components/ui/CodeValue";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { PageHeader, Panel, PanelList } from "@/components/ui/Panel";

export default function TopicsPage() {
  // Create a topic
  const [memoInput, setMemoInput] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedTopic | null>(null);

  // Publish a message
  const [sendTopicInput, setSendTopicInput] = useState("");
  const [messageInput, setMessageInput] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sent, setSent] = useState<SentMessage | null>(null);

  // Read the messages of a topic
  const [readTopicInput, setReadTopicInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [readError, setReadError] = useState<string | null>(null);
  const [messages, setMessages] = useState<TopicMessage[] | null>(null);
  // The topic the displayed messages belong to.
  const [loadedTopicId, setLoadedTopicId] = useState<string | null>(null);

  async function loadMessages(topicId: string) {
    setLoading(true);
    setReadError(null);
    setMessages(null);
    setLoadedTopicId(null);
    try {
      setMessages(await getMessages(topicId));
      setLoadedTopicId(topicId);
    } catch (caught) {
      setReadError(getErrorMessage(caught));
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setCreating(true);
    setCreateError(null);
    setCreated(null);
    try {
      const topic = await createTopic(memoInput.trim() || undefined);
      setCreated(topic);
      // Pre-fill the next forms with the new topic.
      setSendTopicInput(topic.topicId);
      setReadTopicInput(topic.topicId);
      // What is displayed below belongs to the previous topic.
      setSent(null);
      setSendError(null);
      setMessages(null);
      setLoadedTopicId(null);
      setReadError(null);
    } catch (caught) {
      setCreateError(getErrorMessage(caught));
    } finally {
      setCreating(false);
    }
  }

  async function handleSend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const topicId = sendTopicInput.trim();
    const message = messageInput.trim();

    if (!TOPIC_ID_PATTERN.test(topicId)) {
      setSendError("Enter a topic ID like 0.0.123456.");
      return;
    }
    if (message === "") {
      setSendError("Enter a message.");
      return;
    }

    setSending(true);
    setSendError(null);
    setSent(null);
    try {
      setSent(await sendMessage(topicId, message));
      setMessageInput("");
      // Show the new message in the list of this topic.
      setReadTopicInput(topicId);
      await loadMessages(topicId);
    } catch (caught) {
      setSendError(getErrorMessage(caught));
    } finally {
      setSending(false);
    }
  }

  async function handleRead(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const topicId = readTopicInput.trim();
    if (!TOPIC_ID_PATTERN.test(topicId)) {
      setReadError("Enter a topic ID like 0.0.123456.");
      return;
    }
    await loadMessages(topicId);
  }

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-10 px-6 py-10">
      <PageHeader
        title="Topics"
        description="Create a topic, publish messages to it and read them back."
      />

      <PanelList>
        <Panel
          title="Create a topic"
          description="A topic is a channel for messages on the Hedera network. The memo is optional."
        >
          <form onSubmit={handleCreate} className="flex flex-col gap-4">
            <Field label="Memo (optional)">
              <Input
                value={memoInput}
                onChange={(event) => setMemoInput(event.target.value)}
                placeholder="My first topic"
              />
            </Field>
            <Button type="submit" disabled={creating}>
              {creating ? "Creating..." : "Create topic"}
            </Button>
          </form>

          {createError && <Callout tone="danger">{createError}</Callout>}

          {created && (
            <Callout tone="success">
              <p>
                Topic <strong>{created.topicId}</strong> created
                {created.memo ? ` with the memo "${created.memo}"` : ""}.
              </p>
              <CodeValue label="Topic ID" value={created.topicId} />
            </Callout>
          )}
        </Panel>

        <Panel
          title="Publish a message"
          description="The backend signs the message with its operator account."
        >
          <form onSubmit={handleSend} className="flex flex-col gap-4">
            <Field label="Topic ID">
              <Input
                value={sendTopicInput}
                onChange={(event) => setSendTopicInput(event.target.value)}
                placeholder="0.0.123456"
              />
            </Field>
            <Field label="Message">
              <Textarea
                rows={3}
                value={messageInput}
                onChange={(event) => setMessageInput(event.target.value)}
              />
            </Field>
            <Button type="submit" disabled={sending}>
              {sending ? "Publishing..." : "Publish"}
            </Button>
          </form>

          {sendError && <Callout tone="danger">{sendError}</Callout>}

          {sent && (
            <Callout tone="success">
              <p>Message published to topic {sent.topicId}.</p>
              <CodeValue label="Transaction ID" value={sent.transactionId} />
            </Callout>
          )}
        </Panel>

        <Panel
          title="Messages of a topic"
          description="The messages come from the local database of the backend, so only the messages published through this application appear."
        >
          <form onSubmit={handleRead} className="flex flex-col gap-4">
            <Field label="Topic ID">
              <Input
                value={readTopicInput}
                onChange={(event) => setReadTopicInput(event.target.value)}
                placeholder="0.0.123456"
              />
            </Field>
            <Button type="submit" disabled={loading}>
              {loading ? "Loading..." : "Load messages"}
            </Button>
          </form>

          {readError && (
            <Callout tone="danger">
              <p>{readError}</p>
            </Callout>
          )}

          {messages && (
            <div className="flex flex-col gap-3">
              <p className="font-medium">
                Topic <span className="font-mono">{loadedTopicId}</span>:{" "}
                {messages.length} {messages.length === 1 ? "message" : "messages"}
              </p>
              {messages.length === 0 && (
                <p className="text-sm text-muted">
                  No message is stored for this topic. Only the messages
                  published through this application appear here.
                </p>
              )}
              <ul className="flex flex-col gap-3">
                {messages.map((item) => (
                  <li
                    key={item.id}
                    className="flex flex-col gap-1 rounded-xl border border-line bg-surface p-4"
                  >
                    <p>{item.message}</p>
                    <p className="text-sm text-muted">
                      {new Date(item.createdAt).toLocaleString()}
                    </p>
                    <code className="break-all font-mono text-sm text-muted">
                      {item.transactionId}
                    </code>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Panel>
      </PanelList>
    </main>
  );
}
