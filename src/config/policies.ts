// Personal-lines policy types shown on the policyholder home screen.
export type PolicyType = {
  id: string;
  name: string;
  icon: string; // Ionicons name
  tagline: string;
  what: string;
  covers: string[];
  whoNeeds: string;
  tip: string;
  matchLine: string; // matches quiz coverage answers
};

export const POLICY_TYPES: PolicyType[] = [
  {
    id: 'auto', name: 'Auto', icon: 'car-sport-outline', matchLine: 'Auto',
    tagline: 'Required in NJ for every registered car',
    what: 'Auto insurance pays for damage and injuries from car accidents, and protects you if you are sued after one. New Jersey requires liability and Personal Injury Protection (PIP) on every registered car.',
    covers: ['Liability for injuries and damage you cause', 'Personal Injury Protection (PIP) for your medical bills', 'Collision and comprehensive for your own car (optional)', 'Uninsured / underinsured motorist protection'],
    whoNeeds: 'Anyone who owns, leases or regularly drives a car.',
    tip: 'The NJ "basic" policy is cheap but very thin. Ask your agent to compare it with a standard policy.',
  },
  {
    id: 'home', name: 'Homeowners', icon: 'home-outline', matchLine: 'Home',
    tagline: 'Protects your house, your stuff, and you',
    what: 'Homeowners insurance covers the structure of your house, your belongings, and your liability if someone is hurt on your property. Most mortgage lenders require it.',
    covers: ['Your home and attached structures', 'Personal belongings', 'Liability if a guest is injured', 'Living costs if you cannot stay home after a covered loss'],
    whoNeeds: 'Anyone who owns a house, especially with a mortgage.',
    tip: 'Standard policies do not cover flood. In much of NJ, a separate flood policy is worth a look.',
  },
  {
    id: 'renters', name: 'Renters', icon: 'key-outline', matchLine: 'Renters',
    tagline: 'Usually less than a coffee a week',
    what: "Renters insurance covers your belongings and your personal liability. Your landlord's policy covers the building, not your things.",
    covers: ['Furniture, electronics, clothes and more', 'Liability if someone is hurt in your unit', 'Temporary housing after a covered loss', 'Theft, even away from home'],
    whoNeeds: 'Anyone who rents an apartment or house. Many landlords require it.',
    tip: 'Bundling renters with auto often saves more than the renters policy costs.',
  },
  {
    id: 'condo', name: 'Condo', icon: 'business-outline', matchLine: 'Condo',
    tagline: "Fills the gaps in your association's policy",
    what: "Condo (HO-6) insurance covers the inside of your unit, your belongings, and your liability. Your HOA's master policy usually covers only the building and common areas.",
    covers: ['Walls-in: floors, cabinets, fixtures', 'Personal belongings', 'Liability coverage', 'Loss assessment from your HOA'],
    whoNeeds: 'Condo owners. Check your HOA bylaws for what you must insure.',
    tip: 'Ask for your master policy and have your agent read it with you to size coverage right.',
  },
  {
    id: 'umbrella', name: 'Umbrella', icon: 'umbrella-outline', matchLine: 'Umbrella',
    tagline: 'Extra liability protection on top of everything else',
    what: 'Umbrella insurance adds liability coverage (usually $1M or more) above your auto and home policies, for large claims or lawsuits.',
    covers: ['Big injury claims beyond your auto or home limits', 'Certain lawsuits like libel or slander', 'Legal defense costs'],
    whoNeeds: 'Homeowners, people with teen drivers, pools, rental properties, or significant savings.',
    tip: 'It is often surprisingly affordable, around a few hundred dollars a year for $1M.',
  },
  {
    id: 'landlord', name: 'Landlord', icon: 'construct-outline', matchLine: 'Landlord / dwelling fire',
    tagline: 'For homes you rent out to others',
    what: 'Landlord (dwelling fire) insurance covers a property you rent to tenants: the building, your liability as an owner, and lost rent after a covered loss.',
    covers: ['The rental building', 'Landlord liability', 'Lost rental income', 'Appliances or furnishings you provide'],
    whoNeeds: 'Anyone renting out a house, condo, or unit, including a basement apartment.',
    tip: 'A regular homeowners policy usually does not cover a home you rent out. Tell your agent.',
  },
  {
    id: 'life', name: 'Life', icon: 'heart-outline', matchLine: 'Life',
    tagline: 'Peace of mind for the people who count on you',
    what: 'Life insurance pays a tax-free sum to your beneficiaries if you pass away. Term life covers a set number of years; permanent life lasts your whole life and can build cash value.',
    covers: ['Income replacement for your family', 'Mortgage and debt payoff', 'College costs for kids', 'Final expenses'],
    whoNeeds: 'Anyone with a partner, kids, a mortgage, or people who depend on their income.',
    tip: 'Rates are based on age and health. The younger you lock it in, the cheaper it tends to be.',
  },
];
