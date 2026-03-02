import Opening from "@/components/sections/Opening";
import InvestigationTimeline from "@/components/shared/InvestigationTimeline";
import DescriptiveStats from "@/components/sections/DescriptiveStats";
import Timeline from "@/components/sections/Timeline";
import CausalInference from "@/components/sections/CausalInference";
import TopicShifts from "@/components/sections/TopicShifts";
import TwoStarGap from "@/components/sections/TwoStarGap";
import ThreeBillingProblems from "@/components/sections/ThreeBillingProblems";
import ResearchDirections from "@/components/sections/ResearchDirections";
import Closing from "@/components/sections/Closing";
import DataExplorer from "@/components/sections/DataExplorer";
import ScrollProgress from "@/components/shared/ScrollProgress";

export default function Home() {
  return (
    <>
      <ScrollProgress />
      <main>
        <Opening />
        <InvestigationTimeline />
        <DescriptiveStats />
        <Timeline />
        <CausalInference />
        <TopicShifts />
        <TwoStarGap />
        <ThreeBillingProblems />
        <ResearchDirections />
        <Closing />
        <DataExplorer />
      </main>
    </>
  );
}
