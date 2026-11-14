import { joinSession } from "../actions";
import SubmitButton from "@/components/ui/SubmitButton";
import { primaryButton } from "@/components/ui/styles";

export default function JoinButton({
  sessionId,
  classId,
  returnTo,
}: {
  sessionId: string;
  classId: string;
  returnTo?: string;
}) {
  return (
    <form action={joinSession}>
      <input type="hidden" name="session_id" value={sessionId} />
      <input type="hidden" name="class_id" value={classId} />
      <input type="hidden" name="return_to" value={returnTo ?? `/classes/${classId}`} />
      <SubmitButton className={`${primaryButton} w-full sm:w-auto`} pendingText="Opening class">
        Join class
      </SubmitButton>
    </form>
  );
}
