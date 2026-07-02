import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { ReactNode } from "react";

// Shared branded layout for all transactional emails (NASCAR-053). Inline
// styles only — email clients ignore <style>/external CSS. The footer carries
// the unsubscribe link when the recipient is a league member (notifications);
// invites pass `footerNote` instead since the recipient isn't subscribed.
const styles = {
  body: {
    backgroundColor: "#f4f4f5",
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    margin: 0,
    padding: "24px 0",
  },
  container: {
    backgroundColor: "#ffffff",
    border: "1px solid #e4e4e7",
    borderRadius: "12px",
    margin: "0 auto",
    maxWidth: "520px",
    overflow: "hidden",
  },
  header: {
    backgroundColor: "#0a0a0a",
    padding: "20px 28px",
  },
  brand: {
    color: "#ffffff",
    fontSize: "16px",
    fontWeight: 700,
    letterSpacing: "0.02em",
    margin: 0,
  },
  content: { padding: "28px" },
  footer: { padding: "0 28px 28px" },
  footerText: {
    color: "#71717a",
    fontSize: "12px",
    lineHeight: "18px",
    margin: 0,
  },
  footerLink: { color: "#71717a", textDecoration: "underline" },
} as const;

export function EmailLayout({
  preview,
  children,
  unsubscribeUrl,
  footerNote,
}: {
  preview: string;
  children: ReactNode;
  unsubscribeUrl?: string;
  footerNote?: string;
}) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Section style={styles.header}>
            <Text style={styles.brand}>🏁 Champions of NASCAR</Text>
          </Section>
          <Section style={styles.content}>{children}</Section>
          <Hr style={{ borderColor: "#e4e4e7", margin: "0 28px" }} />
          <Section style={styles.footer}>
            {footerNote ? (
              <Text style={styles.footerText}>{footerNote}</Text>
            ) : null}
            <Text style={styles.footerText}>
              Champions of NASCAR — a fan project for running online careers.
              {unsubscribeUrl ? (
                <>
                  {" "}
                  <Link style={styles.footerLink} href={unsubscribeUrl}>
                    Unsubscribe from this league&apos;s emails
                  </Link>
                  .
                </>
              ) : null}
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// Reusable text + button styles for templates.
export const text = {
  heading: {
    color: "#0a0a0a",
    fontSize: "20px",
    fontWeight: 700,
    margin: "0 0 12px",
  },
  paragraph: {
    color: "#3f3f46",
    fontSize: "14px",
    lineHeight: "22px",
    margin: "0 0 16px",
  },
  button: {
    backgroundColor: "#0a0a0a",
    borderRadius: "8px",
    color: "#ffffff",
    display: "inline-block",
    fontSize: "14px",
    fontWeight: 600,
    padding: "10px 20px",
    textDecoration: "none",
  },
  detail: {
    color: "#71717a",
    fontSize: "13px",
    lineHeight: "20px",
    margin: "0 0 4px",
  },
} as const;
