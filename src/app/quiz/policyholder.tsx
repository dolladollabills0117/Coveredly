import { router } from 'expo-router';
import { Quiz } from '../../components/Quiz';
import { useAuth } from '../../lib/auth';
import { api } from '../../lib/backend';
import { POLICYHOLDER_QUIZ } from '../../config/quizzes';

export default function PolicyholderQuiz() {
  const { user, refresh } = useAuth();
  return (
    <Quiz
      eyebrow="Find your agent match"
      questions={POLICYHOLDER_QUIZ}
      gate={(qid, a) => qid === 'state' && a.state === 'Another state'
        ? { title: "Sorry, we're not in your state yet 💛", body: "Coveredly is only available in New Jersey right now, and we're growing from here. We'll let you know by email as soon as we expand." }
        : null}
      onDone={async (a) => {
        await api.savePolicyholderQuiz({
          fullName: user?.fullName ?? '', phone: (a.phone as string) || undefined, zip: (a.zip as string) || undefined,
          state: a.state as string, county: a.county as string, coverage: a.coverage as string[], language: a.language as string,
          contactMethod: a.contactMethod as string, explainStyle: a.explainStyle as string, decisionStyle: a.decisionStyle as string,
          timing: a.timing as string, mattersMost: a.mattersMost as string,
        });
        await refresh();
        router.replace('/policyholder');
      }}
    />
  );
}
