import { useState, useEffect } from 'react';
import { checkForUpdate } from '../services/version';

const VERSION_CHECK_ENDPOINT = 'https://flixor.app/api/version';
const CURRENT_VERSION = '1.0.0';

export function useUpdateCheck() {
  const [hasUpdate, setHasUpdate] = useState(false);
  const [version, setVersion] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    checkForUpdate(CURRENT_VERSION, VERSION_CHECK_ENDPOINT)
      .then((info) => {
        if (info.hasUpdate) {
          setHasUpdate(true);
          setVersion(info.latestVersion);
        }
      })
      .catch(() => {});
  }, []);

  const dismiss = () => setDismissed(true);

  return { hasUpdate: hasUpdate && !dismissed, version, dismiss };
}
