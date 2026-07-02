import { Button, Section, Text } from "@react-email/components";

import { EmailLayout, text } from "./components/email-layout";

export type LeagueInviteEmailProps = {
  leagueName: string;
  inviterName: string;
  joinUrl: string;
};

// Invite to join a league (NASCAR-031). The recipient isn't a member yet, so
// there's no unsubscribe link — a `footerNote` explains why they got it.
export function LeagueInviteEmail({
  leagueName,
  inviterName,
  joinUrl,
}: LeagueInviteEmailProps) {
  return (
    <EmailLayout
      preview={`${inviterName} invited you to ${leagueName}`}
      footerNote={`You received this because ${inviterName} invited you to their league. If you weren't expecting it, you can ignore this email.`}
    >
      <Text style={text.heading}>You&apos;re invited to race</Text>
      <Text style={text.paragraph}>
        {inviterName} invited you to join <strong>{leagueName}</strong> on
        Champions of NASCAR. Click below to join the league — the join code is
        already filled in for you.
      </Text>
      <Section style={{ margin: "8px 0 20px" }}>
        <Button style={text.button} href={joinUrl}>
          Join {leagueName}
        </Button>
      </Section>
      <Text style={text.detail}>
        Or paste this link into your browser: {joinUrl}
      </Text>
    </EmailLayout>
  );
}

// Default export with sample props so `react-email` preview can render it.
export default function Preview() {
  return (
    <LeagueInviteEmail
      leagueName="Sunday Night Throwdown"
      inviterName="Dale"
      joinUrl="https://example.com/leagues/join?code=ABCD2345"
    />
  );
}
