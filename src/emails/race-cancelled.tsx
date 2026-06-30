import { Button, Section, Text } from "@react-email/components";

import { EmailLayout, text } from "./components/email-layout";

export type RaceCancelledEmailProps = {
  leagueName: string;
  round: number;
  trackName: string;
  /** Optional admin-supplied reason; omitted when empty. */
  reason?: string;
  raceUrl: string;
  unsubscribeUrl: string;
};

// Sent when an admin cancels a race (NASCAR-054). Member-facing → unsubscribe.
export function RaceCancelledEmail({
  leagueName,
  round,
  trackName,
  reason,
  raceUrl,
  unsubscribeUrl,
}: RaceCancelledEmailProps) {
  return (
    <EmailLayout
      preview={`Round ${round} at ${trackName} has been cancelled`}
      unsubscribeUrl={unsubscribeUrl}
    >
      <Text style={text.heading}>A race has been cancelled</Text>
      <Text style={text.paragraph}>
        Round {round} of <strong>{leagueName}</strong> at {trackName} has been
        cancelled.
      </Text>
      {reason ? <Text style={text.detail}>Reason: {reason}</Text> : null}
      <Section style={{ margin: "16px 0 4px" }}>
        <Button style={text.button} href={raceUrl}>
          View the schedule
        </Button>
      </Section>
    </EmailLayout>
  );
}

export default function Preview() {
  return (
    <RaceCancelledEmail
      leagueName="Sunday Night Throwdown"
      round={3}
      trackName="Talladega"
      reason="Weather"
      raceUrl="https://example.com/leagues/abc/races/xyz"
      unsubscribeUrl="https://example.com/unsubscribe?token=demo"
    />
  );
}
