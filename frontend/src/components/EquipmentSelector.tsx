import { useBows } from '../api/bows';
import { useArrows } from '../api/arrows';
import { useTabs } from '../api/tabs';

interface EquipmentSelectorProps {
  type: 'bow' | 'arrow' | 'tab';
  value: string;
  onChange: (value: string) => void;
  includeCreateNew?: boolean;
}

export default function EquipmentSelector({ 
  type, 
  value, 
  onChange, 
  includeCreateNew = true 
}: EquipmentSelectorProps) {
  const { data: bows, isLoading: bowsLoading } = useBows();
  const { data: arrows, isLoading: arrowsLoading } = useArrows();
  const { data: tabs, isLoading: tabsLoading } = useTabs();

  const isLoading = type === 'bow' ? bowsLoading : type === 'arrow' ? arrowsLoading : tabsLoading;
  const options = type === 'bow' ? bows : type === 'arrow' ? arrows : tabs;

  if (isLoading) {
    return <select disabled><option>Loading...</option></select>;
  }

  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}>
      {includeCreateNew && <option value="new">+ Create New</option>}
      <option value="">-- Select {type} --</option>
      {options?.map((item) => (
        <option key={item.id} value={item.id}>
          {'name' in item ? item.name : `${item.make} ${item.model}`}
        </option>
      ))}
    </select>
  );
}
