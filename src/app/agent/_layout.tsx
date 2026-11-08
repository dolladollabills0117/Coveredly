import { RoleTabs } from '../../components/TabsLayout';

export default function AgentLayout() {
  return <RoleTabs role="agent" tabs={[
    { name: 'index', title: 'Leads', icon: 'people-outline' },
    { name: 'tips', title: 'Sell faster', icon: 'flame-outline' },
    { name: 'profile', title: 'Profile', icon: 'person-circle-outline' },
  ]} />;
}
