import { useSettings } from '../hooks/useSettings';

const STRICTNESS_OPTIONS = [
  {
    value: 'Relaxed',
    label: 'Relaxed',
    description: 'More positive / happy-path focus. Lighter negative and boundary coverage.'
  },
  {
    value: 'Balanced',
    label: 'Balanced',
    description: 'Standard coverage ratio. Good mix of positive, negative, edge, boundary.'
  },
  {
    value: 'Strict',
    label: 'Strict',
    description: 'Heavy negative path, boundary, and validation focus. More edge cases.'
  }
] as const;

export default function Settings() {
  const { settings, updateSettings } = useSettings();

  const handleTargetCount = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = parseInt(e.target.value, 10);
    if (isNaN(val)) val = 25;
    if (val < 12) val = 12;
    if (val > 50) val = 50;
    updateSettings({ target_count: val });
  };

  return (
    <div className="max-w-xl space-y-8">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-qa-text-pri">Settings</h2>
        <p className="text-sm text-qa-text-sec mt-1">
          Generation preferences saved locally to your browser. They do not affect the backend.
        </p>
      </div>

      {/* Target count */}
      <div className="rounded-lg border border-qa-border bg-qa-surface1 p-5 space-y-4">
        <div>
          <p className="text-sm font-medium text-qa-text-pri">Target Test Cases</p>
          <p className="text-xs text-qa-text-sec mt-0.5">
            Instructs the AI how many test cases to aim for. The backend enforces a hard cap of 50.
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-xs text-qa-text-sec">
            <span>12 (min)</span>
            <span className="text-qa-accent-pri font-semibold text-sm">{settings.target_count}</span>
            <span>50 (cap)</span>
          </div>
          <input
            type="range"
            min={12}
            max={50}
            value={settings.target_count}
            onChange={handleTargetCount}
            className="w-full accent-qa-accent-pri cursor-pointer"
          />
          <p className="text-[11px] text-qa-text-sec">
            Recommended MVP default: 12–15. Generation counts above 25 heavily consume AI rate-limit quota.
          </p>
        </div>
      </div>

      {/* Strictness preset */}
      <div className="rounded-lg border border-qa-border bg-qa-surface1 p-5 space-y-4">
        <div>
          <p className="text-sm font-medium text-qa-text-pri">Testing Strictness</p>
          <p className="text-xs text-qa-text-sec mt-0.5">
            Guides the model on how to weight different test case categories.
          </p>
        </div>

        <div className="space-y-2">
          {STRICTNESS_OPTIONS.map(opt => (
            <label
              key={opt.value}
              className={`flex items-start gap-3 rounded-md border p-3.5 cursor-pointer transition-colors ${
                settings.strictness_preset === opt.value
                  ? 'border-qa-accent-pri/60 bg-qa-accent-pri/10'
                  : 'border-qa-border hover:border-qa-text-sec/30 hover:bg-qa-surface2'
              }`}
            >
              <input
                type="radio"
                name="strictness"
                value={opt.value}
                checked={settings.strictness_preset === opt.value}
                onChange={() => updateSettings({ strictness_preset: opt.value })}
                className="mt-0.5 accent-qa-accent-pri flex-shrink-0"
              />
              <div>
                <p className={`text-sm font-medium ${settings.strictness_preset === opt.value ? 'text-qa-accent-pri/90' : 'text-qa-text-pri/80'}`}>
                  {opt.label}
                </p>
                <p className="text-xs text-qa-text-sec mt-0.5">{opt.description}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Info note */}
      <div className="rounded-lg border border-qa-border bg-qa-bg p-4">
        <p className="text-xs text-qa-text-sec leading-relaxed">
          These settings are stored in <code className="font-mono text-qa-text-sec">localStorage</code> under <code className="font-mono text-qa-text-sec">qa_logic_settings</code>.
          They are merged into the generation payload on each submit and are not persisted in the backend.
          The backend remains the final source of truth for all constraints.
        </p>
      </div>
    </div>
  );
}
