import { RoleTabs } from '../../components/TabsLayout';

export default function AdminLayout() {
  return <RoleTabs role="admin" tabs={[
    { name: 'index', title: 'Approvals', icon: 'git-compare-outline' },
    { name: 'policyholders', title: 'Clients', icon: 'person-outline' },
    { name: 'activity', title: 'Activity', icon: 'pulse-outline' },
    { name: 'reports', title: 'Reports', icon: 'flag-outline' },
    { name: 'agents', title: 'Agents', icon: 'people-outline' },
  ]} />;
}
