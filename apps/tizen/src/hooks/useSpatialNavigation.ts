import { useFocusable, FocusContext } from '@noriginmedia/norigin-spatial-navigation';

export { useFocusable, FocusContext };

export function useSpatialSection(focusKey?: string) {
  const { ref, focusKey: key, focusSelf } = useFocusable({
    focusKey,
    trackChildren: true,
  });
  return { ref, focusKey: key, focusSelf };
}
