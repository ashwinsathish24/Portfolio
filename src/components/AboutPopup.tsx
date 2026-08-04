import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';

export default function AboutPopup() {
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAbout() {
      try {
        const { data, error } = await supabase
          .from('about_popup')
          .select('content')
          .limit(1)
          .single();
          
        if (!error && data) {
          setContent(data.content || '');
        }
      } catch (err) {
        console.error('Failed to fetch about popup content:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchAbout();
  }, []);

  return (
    <div className="fixed bottom-6 left-6 z-50 flex flex-col items-start gap-2">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="bg-[#FAF9F5]/95 backdrop-blur-sm border border-stone-200 rounded-xl px-4 py-3 shadow-lg w-72 max-h-96 overflow-y-auto"
            style={{ cursor: 'none' }}
          >
            {loading ? (
              <p className="text-xs text-stone-400 font-mono tracking-wide">Loading...</p>
            ) : content.trim() ? (
              <div className="text-sm text-stone-600 font-light tracking-wide font-sans whitespace-pre-wrap leading-relaxed">
                {content}
              </div>
            ) : (
              <p className="text-xs text-stone-400 font-mono tracking-wide">
                No about information provided yet.
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setOpen((o) => !o)}
        className="group text-[10px] font-mono tracking-[0.2em] uppercase select-none"
      >
        {open ? (
          <span className="text-stone-300">Close</span>
        ) : (
          <span className="cue-highlight-alt group-hover:tracking-[0.25em] transition-all duration-300">
            About
          </span>
        )}
      </button>
    </div>
  );
}
