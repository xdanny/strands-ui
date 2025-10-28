"use client";

import { useEffect, useState } from "react";
import { WSEvent } from "@/lib/websocket";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, AlertTriangle } from "lucide-react";

type PlanModeDetectorProps = {
  events: WSEvent[];
  onApprove: () => void;
  onReject: () => void;
  onModify: (feedback: string) => void;
};

type DetectedPlan = {
  content: string;
  startIndex: number;
  endIndex: number;
};

export function PlanModeDetector({ events, onApprove, onReject, onModify }: PlanModeDetectorProps) {
  const [detectedPlan, setDetectedPlan] = useState<DetectedPlan | null>(null);
  const [showModifyInput, setShowModifyInput] = useState(false);
  const [modifyText, setModifyText] = useState("");

  useEffect(() => {
    // Look for plan mode patterns in recent events
    const recentEvents = events.slice(-20); // Check last 20 events

    for (let i = 0; i < recentEvents.length; i++) {
      const event = recentEvents[i];
      if (event.type === "stdout" && event.content) {
        const content = event.content.toLowerCase();

        // Common patterns that indicate plan mode
        const planPatterns = [
          /plan mode/i,
          /would you like to proceed/i,
          /do you want me to/i,
          /shall i proceed/i,
          /approve.*plan/i,
          /ready to.*execute/i,
          /\[y\/n\]/i,
          /confirm.*changes/i
        ];

        const isPlanMode = planPatterns.some(pattern => pattern.test(event.content || ""));

        if (isPlanMode) {
          // Collect the plan content (look backwards for context)
          const startIdx = Math.max(0, i - 5);
          const planContent = recentEvents
            .slice(startIdx, i + 1)
            .filter(e => e.type === "stdout")
            .map(e => e.content)
            .join("\n");

          setDetectedPlan({
            content: planContent,
            startIndex: startIdx,
            endIndex: i
          });
          return;
        }
      }
    }

    // Check if plan was handled
    const lastEvent = recentEvents[recentEvents.length - 1];
    if (detectedPlan && lastEvent?.type === "user_input") {
      // User responded, clear the plan
      setDetectedPlan(null);
      setShowModifyInput(false);
    }
  }, [events]);

  if (!detectedPlan) {
    return null;
  }

  const handleApprove = () => {
    onApprove();
    setDetectedPlan(null);
  };

  const handleReject = () => {
    onReject();
    setDetectedPlan(null);
  };

  const handleModify = () => {
    if (modifyText.trim()) {
      onModify(modifyText);
      setDetectedPlan(null);
      setShowModifyInput(false);
      setModifyText("");
    }
  };

  return (
    <div className="sticky bottom-20 mx-4 mb-4">
      <div className="bg-yellow-50 dark:bg-yellow-950 border-2 border-yellow-400 dark:border-yellow-600 rounded-lg shadow-lg p-4 max-w-4xl mx-auto">
        <div className="flex items-start gap-3 mb-4">
          <AlertTriangle className="h-6 w-6 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-1" />
          <div className="flex-1">
            <h3 className="font-semibold text-lg text-yellow-900 dark:text-yellow-100 mb-2">
              Plan Mode Detected
            </h3>
            <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-3">
              The agent is waiting for your approval to proceed. Review the plan and choose an action:
            </p>
          </div>
        </div>

        {!showModifyInput ? (
          <div className="flex gap-2 flex-wrap">
            <Button
              onClick={handleApprove}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Approve & Execute
            </Button>
            <Button
              onClick={() => setShowModifyInput(true)}
              variant="outline"
            >
              Modify Plan
            </Button>
            <Button
              onClick={handleReject}
              variant="destructive"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Reject
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <textarea
              value={modifyText}
              onChange={(e) => setModifyText(e.target.value)}
              placeholder="Describe the changes you'd like to make..."
              className="w-full min-h-[100px] p-3 border rounded-md resize-y bg-white dark:bg-gray-900"
            />
            <div className="flex gap-2">
              <Button onClick={handleModify}>
                Send Feedback
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowModifyInput(false);
                  setModifyText("");
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
