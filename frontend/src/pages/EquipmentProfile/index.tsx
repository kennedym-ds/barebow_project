import { useState } from 'react';
import BowForm from './BowForm';
import ArrowForm from './ArrowForm';
import TabForm from './TabForm';
import './EquipmentProfile.css';

type TabType = 'bow' | 'arrow' | 'tab';

export default function EquipmentProfile() {
  const [activeTab, setActiveTab] = useState<TabType>('bow');

  return (
    <div className="equipment-profile">
      <h1>Equipment Profile</h1>
      <p className="page-description">Manage your bow, arrow, and tab configurations.</p>

      <div className="equipment-tabs">
        <button
          className={`tab-button ${activeTab === 'bow' ? 'active' : ''}`}
          onClick={() => setActiveTab('bow')}
        >
          Bow Setup
        </button>
        <button
          className={`tab-button ${activeTab === 'arrow' ? 'active' : ''}`}
          onClick={() => setActiveTab('arrow')}
        >
          Arrow Setup
        </button>
        <button
          className={`tab-button ${activeTab === 'tab' ? 'active' : ''}`}
          onClick={() => setActiveTab('tab')}
        >
          Tab Setup
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'bow' && <BowForm />}
        {activeTab === 'arrow' && <ArrowForm />}
        {activeTab === 'tab' && <TabForm />}
      </div>
    </div>
  );
}
