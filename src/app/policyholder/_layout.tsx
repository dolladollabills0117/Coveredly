import { RoleTabs } from '../../components/TabsLayout';

export default function PolicyholderLayout() {
  return <RoleTabs role="policyholder" tabs={[
    { name: 'index', title: 'Home', icon: 'home-outline' },
    { name: 'agent', title: 'My agent', icon: 'person-outline' },
    { name: 'profile', title: 'Profile', icon: 'settings-outline' },
  ]} />;
}
