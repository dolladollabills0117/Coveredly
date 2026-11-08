import { router } from 'expo-router';
import { Quiz } from '../../components/Quiz';
import { useAuth } from '../../lib/auth';
import { api } from '../../lib/backend';
import { AGENT_QUIZ } from '../../config/quizzes';

export default function AgentQuiz() {
  const { user, refresh } = useAuth();
  return (
    <Quiz
      eyebrow="Founding agent profile"
      questions={AGENT_QUIZ}
      onDone={async (a) => {
        await api.saveAgentQuiz({
          fullName: user?.fullName ?? '', license: a.license as string, phone: (a.phone as string) || undefined,
          licensedStates: ['New Jersey'], counties: (a.counties as string[]) ?? [], contactMethod: a.contactMethod as string,
          languages: a.languages as string[], explains: a.explains as string, advises: a.advises as string, speed: a.speed as string,
          bestLeadType: a.bestLeadType as string, lines: a.lines as string[],
        });
        await refresh();
        router.replace('/plan');
      }}
    />
  );
}
