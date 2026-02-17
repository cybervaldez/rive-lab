import { useState, useCallback } from 'react'
import type { Recipe } from '../lib/recipes'
import type { MachineDocData } from '../lib/extractMachineDoc'
import { generateRivePrompt } from '../lib/generateRivePrompt'
import { MachineDoc } from './MachineDoc'

type TabId = 'concept' | 'steps' | 'reference'

interface RecipePanelProps {
  recipe: Recipe
  machineDocData: MachineDocData
  stateValue: string
  checkedSteps: Set<number>
  toggleStep: (index: number) => void
  onOpenWizard: () => void
}

export function RecipePanel({
  recipe,
  machineDocData,
  stateValue,
  checkedSteps,
  toggleStep,
  onOpenWizard,
}: RecipePanelProps) {
  const hasConcept = !!recipe.concept
  const defaultTab: TabId = hasConcept ? 'concept' : 'steps'
  const [activeTab, setActiveTab] = useState<TabId>(defaultTab)

  const tabs: { id: TabId; label: string; show: boolean }[] = [
    { id: 'concept', label: 'concept', show: hasConcept },
    { id: 'steps', label: 'steps', show: true },
    { id: 'reference', label: 'reference', show: true },
  ]

  return (
    <div className="recipe-panel" data-testid="recipe-panel">
      {/* Tab bar */}
      <div className="recipe-panel-tabs" data-testid="recipe-panel-tabs">
        {tabs.filter((t) => t.show).map((tab) => (
          <button
            key={tab.id}
            className={`recipe-panel-tab${activeTab === tab.id ? ' recipe-panel-tab--active' : ''}`}
            data-testid={`recipe-tab-${tab.id}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="recipe-panel-content" data-testid="recipe-panel-content">
        {activeTab === 'concept' && recipe.concept && (
          <ConceptTab concept={recipe.concept} />
        )}

        {activeTab === 'steps' && (
          <StepsTab
            instruct={recipe.instruct}
            checkedSteps={checkedSteps}
            toggleStep={toggleStep}
            onOpenWizard={onOpenWizard}
          />
        )}

        {activeTab === 'reference' && (
          <ReferenceTab
            machineDocData={machineDocData}
            stateValue={stateValue}
          />
        )}
      </div>
    </div>
  )
}

/* --- Concept Tab --- */

function ConceptTab({ concept }: { concept: NonNullable<Recipe['concept']> }) {
  return (
    <div className="concept-tab" data-testid="concept-tab">
      <p className="concept-summary" data-testid="concept-summary">
        {concept.summary}
      </p>

      {concept.regions && concept.regions.length > 0 && (
        <div className="concept-regions" data-testid="concept-regions">
          <div className="t-section-header">&gt; Regions</div>
          <table className="concept-regions-table">
            <thead>
              <tr>
                <th>Region</th>
                <th>Properties</th>
                <th>Purpose</th>
              </tr>
            </thead>
            <tbody>
              {concept.regions.map((r) => (
                <tr key={r.name} data-testid={`concept-region-${r.name.toLowerCase().replace(/\s+/g, '-')}`}>
                  <td className="concept-region-name">{r.name}</td>
                  <td className="concept-region-props">
                    {r.properties.map((p) => (
                      <code key={p}>{p}</code>
                    ))}
                  </td>
                  <td className="concept-region-desc">{r.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

/* --- Steps Tab --- */

function StepsTab({
  instruct,
  checkedSteps,
  toggleStep,
  onOpenWizard,
}: {
  instruct: Recipe['instruct']
  checkedSteps: Set<number>
  toggleStep: (index: number) => void
  onOpenWizard: () => void
}) {
  return (
    <div className="instruct-panel" data-testid="instruct-panel">
      <ol className="instruct-list" data-testid="instruct-list">
        {instruct.map((item, i) => (
          <li
            key={i}
            className={`instruct-step${checkedSteps.has(i) ? ' instruct-step--checked' : ''}`}
            data-testid={`instruct-step-${i}`}
            onClick={() => toggleStep(i)}
          >
            <span className="instruct-step-title">{item.step}</span>
            <span className="instruct-step-detail">{item.detail}</span>
          </li>
        ))}
      </ol>
      <p className="instruct-hint" data-testid="instruct-hint">
        Click on an item to mark it as complete
      </p>
      <button
        className="instruct-test-btn"
        data-testid="instruct-test-btn"
        onClick={onOpenWizard}
      >
        test
      </button>
    </div>
  )
}

/* --- Reference Tab --- */

function ReferenceTab({
  machineDocData,
  stateValue,
}: {
  machineDocData: MachineDocData
  stateValue: string
}) {
  const [copied, setCopied] = useState(false)

  const handleCopyPrompt = useCallback(() => {
    const prompt = generateRivePrompt(machineDocData)
    navigator.clipboard.writeText(prompt).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [machineDocData])

  return (
    <div className="reference-tab" data-testid="reference-tab">
      <div className="reference-tab-actions" data-testid="reference-tab-actions">
        <button
          className="demo-btn"
          data-testid="copy-rive-prompt"
          onClick={handleCopyPrompt}
        >
          {copied ? 'copied!' : 'copy rive prompt'}
        </button>
      </div>
      <MachineDoc data={machineDocData} stateValue={stateValue} />
    </div>
  )
}
