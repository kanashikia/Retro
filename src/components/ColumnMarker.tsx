import { ArrowRight, Circle, Minus, Plus, Search } from 'lucide-react';
import { ColumnType } from '../types';

interface Props {
  column: ColumnType;
  className?: string;
}

const ColumnMarker = ({ column, className = 'w-2.5 h-2.5' }: Props) => {
  switch (column) {
    case ColumnType.WELL:
      return <Plus className={className} strokeWidth={2.5} />;
    case ColumnType.LESS_WELL:
      return <Minus className={className} strokeWidth={2.5} />;
    case ColumnType.PUZZLES:
      return <Search className={className} strokeWidth={2.5} />;
    case ColumnType.TRY_NEXT:
      return <ArrowRight className={className} strokeWidth={2.25} />;
    default:
      return <Circle className={className} strokeWidth={2.25} />;
  }
};

export default ColumnMarker;
