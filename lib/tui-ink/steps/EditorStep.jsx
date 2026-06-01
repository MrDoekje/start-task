import React, { useEffect, useState } from "react";
import { Box, Text, useInput, useStdin } from "ink";
import { EDITOR_NAME, spawnEditor } from "../stepHelpers.js";
import { isCancel } from "../keys.js";
import { ERROR } from "../theme.js";

/**
 * Editor step: pauses Ink, opens $EDITOR with the buffer, reads back the result.
 */
export default function EditorStep({ step, initialValue, config, utils, onSubmit, onBack }) {
  const { setRawMode, isRawModeSupported } = useStdin();
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);

  useInput((input, key) => {
    if (done && isCancel(input, key)) onBack();
  });

  useEffect(() => {
    // Paint the "opening editor" line for one tick, then spawn synchronously
    const id = setTimeout(() => {
      try {
        const header =
          step.editorHeader ??
          `# ${step.message}\n# Lines starting with # are stripped. Save and close to continue.\n\n`;
        const value = spawnEditor({
          initial: initialValue || "",
          header,
          fileName: step.fileName || "input.md",
          setRawMode,
          isRawModeSupported,
          stripComments: true,
        }) || undefined;

        let result = value;
        if (step.optional && !value) result = undefined;
        else if (step.transform) result = step.transform(value, utils, config);

        setDone(true);
        onSubmit(result);
      } catch (e) {
        setError(e?.message ?? String(e));
        setDone(true);
      }
    }, 30);
    return () => clearTimeout(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return (
      <Box flexDirection="column">
        <Text color={ERROR}>editor failed: {error}</Text>
        <Box marginTop={1}><Text dimColor>esc to go back</Text></Box>
      </Box>
    );
  }

  return (
    <Box>
      <Text dimColor>opening {EDITOR_NAME}... save and close to continue</Text>
    </Box>
  );
}
