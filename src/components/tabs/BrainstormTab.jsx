"use client";

import { motion } from "framer-motion";
import { useAppData } from "../../context/AppDataContext";

export default function BrainstormTab({ onCreateActivity }) {
  const {
    ideas,
    endorseIdea,
    endorsementThreshold,
    currentUserId,
    loadingIdeas,
  } = useAppData();

  const handleCreateClick = () => {
    if (typeof onCreateActivity === "function") {
      onCreateActivity();
    }
  };

  if (loadingIdeas) {
    return (
      <section className="rounded-3xl bg-white/80 backdrop-blur border border-white/60 shadow-xl p-10 flex items-center justify-center min-h-[40vh]">
        <p className="text-sm font-semibold text-indigo-500">Loading community brainstorms…</p>
      </section>
    );
  }

  return (
    <section className="space-y-12">
      <div className="rounded-3xl bg-white/80 border border-white/60 shadow-xl p-6 md:p-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div className="max-w-3xl space-y-4">
          <h2 className="text-3xl font-extrabold text-gray-900">Brainstorm & bring it to life</h2>
          <p className="text-gray-600">
            Have an idea that deserves a spotlight? Turn it into a real activity and let the community rally
            around it. You can still explore and endorse ideas below for extra momentum.
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
          type="button"
          onClick={handleCreateClick}
          className="w-full lg:w-56 rounded-full bg-gradient-to-r from-indigo-600 to-pink-500 text-white font-semibold px-6 py-4 shadow-lg hover:shadow-xl transition-all text-center"
        >
          Post an activity
        </motion.button>
      </div>

      <div className="space-y-6">
        {ideas.map((idea) => {
          const hasEndorsed = idea.supporters.includes(currentUserId);
          const progress = Math.min(idea.supporters.length / endorsementThreshold, 1);
          const statusColor =
            idea.status === "launched"
              ? "text-emerald-600 bg-emerald-50"
              : idea.status === "ready"
              ? "text-indigo-600 bg-indigo-50"
              : "text-gray-600 bg-gray-100";

          return (
            <motion.div
              key={idea.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-3xl border border-gray-100 bg-white shadow-lg p-6 space-y-4"
            >
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="text-xl font-semibold text-gray-900">{idea.title}</h3>
                    <span className={`text-xs font-semibold px-3 py-1 rounded-full ${statusColor}`}>
                      {idea.status === "launched"
                        ? "Live event"
                        : idea.status === "ready"
                        ? "Ready to launch"
                        : "Collecting endorsements"}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-2">{idea.description}</p>
                  <div className="flex flex-wrap gap-2 mt-3 text-xs text-gray-500">
                    <span className="bg-indigo-50 text-indigo-500 px-3 py-1 rounded-full">
                      {idea.category}
                    </span>
                    {idea.tags.map((tag) => (
                      <span key={tag} className="bg-gray-100 px-3 py-1 rounded-full">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="w-full md:w-60 bg-indigo-50/60 border border-indigo-100 rounded-3xl p-4 space-y-2">
                  <p className="text-sm font-semibold text-indigo-600">
                    {idea.supporters.length} / {endorsementThreshold} endorsements
                  </p>
                  <div className="h-2 bg-white rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-pink-500"
                      style={{ width: `${progress * 100}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500">
                    Suggested timing: {idea.suggestedTime} • preferred spot: {idea.preferredLocation}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <motion.button
                  whileHover={{ scale: hasEndorsed ? 1 : 1.03 }}
                  whileTap={{ scale: hasEndorsed ? 1 : 0.97 }}
                  onClick={() => endorseIdea(idea.id)}
                  disabled={hasEndorsed || idea.status === "launched"}
                  className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all ${
                    hasEndorsed || idea.status === "launched"
                      ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                      : "bg-gradient-to-r from-indigo-600 to-pink-500 text-white shadow-md hover:shadow-xl"
                  }`}
                >
                  {hasEndorsed ? "You endorsed this" : "Endorse idea"}
                </motion.button>
                <span className="text-sm text-gray-500">
                  Supporters: {idea.supporters.length === 0 ? "be the first!" : idea.supporters.join(", ")}
                </span>
              </div>
            </motion.div>
          );
        })}

        {ideas.length === 0 && (
          <div className="rounded-3xl border border-dashed border-indigo-300 bg-white/70 p-10 text-center text-gray-500">
            <h3 className="text-lg font-semibold text-indigo-500">No brainstorm ideas yet</h3>
            <p className="mt-2">Post an activity to get the community excited—or endorse one you love.</p>
          </div>
        )}
      </div>
    </section>
  );
}
