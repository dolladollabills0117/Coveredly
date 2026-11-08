import { View } from 'react-native';
import { Body, Button, Card, Empty, Eyebrow, H1, H3, Pill, Row, Screen, Small } from '../../components/ui';
import { LEAD_REPLACEMENT_POLICY } from '../../config/leadReplacementPolicy';
import { api } from '../../lib/backend';
import { timeAgo, useLive } from '../../lib/hooks';
import { space } from '../../lib/theme';

export default function Reports() {
  const { data } = useLive(() => api.listReports());
  return (
    <Screen>
      <Eyebrow>Admin</Eyebrow>
      <H1 style={{ marginTop: 4 }}>Bad lead reports</H1>
      <Small style={{ marginTop: 6, marginBottom: space(6) }}>{LEAD_REPLACEMENT_POLICY.summary}</Small>
      {data && data.length === 0 && <Empty icon="flag-outline" title="No reports" body="When an agent reports a lead, it shows up here for you to approve or deny." />}
      <View style={{ gap: space(3) }}>
        {(data ?? []).map((r) => (
          <Card key={r.id}>
            <Row style={{ justifyContent: 'space-between' }}>
              <H3>{r.policyholderName}</H3>
              <Pill label={r.status} tone={r.status === 'open' ? 'orange' : r.status === 'approved' ? 'green' : 'neutral'} />
            </Row>
            <Small style={{ marginTop: 4 }}>Reported by {r.agentName} · {timeAgo(r.createdAt)}</Small>
            <Body style={{ marginTop: space(3), fontWeight: '600' }}>{r.reason}</Body>
            {r.details && <Body style={{ marginTop: 4 }}>{r.details}</Body>}
            {r.status === 'open' && (
              <Row gap={2} style={{ marginTop: space(4) }}>
                <Button small title="Approve replacement" style={{ flex: 1 }} onPress={() => api.resolveReport(r.id, true)} />
                <Button small variant="outline" title="Deny" style={{ flex: 1 }} onPress={() => api.resolveReport(r.id, false)} />
              </Row>
            )}
          </Card>
        ))}
      </View>
    </Screen>
  );
}
