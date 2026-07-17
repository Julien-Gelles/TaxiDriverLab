import { useId } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { Tooltip } from "react-tooltip";
import "react-tooltip/dist/react-tooltip.css";

import { WidgetHelpButton } from "../styles";
import { theme } from "../styles/theme";
import type { WidgetHelpProps } from "../types";

export const WidgetHelp = ({ content }: WidgetHelpProps) => {
  const id = useId();
  const { t } = useTranslation();
  return (
    <>
      <WidgetHelpButton
        data-widget-help
        data-tooltip-id={id}
        data-tooltip-content={content}
        aria-label={t("widgetHelp.label")}
      >
        ?
      </WidgetHelpButton>
      {createPortal(
        <Tooltip
          id={id}
          place="bottom"
          style={{
            background: theme.creamDark,
            color: theme.ink,
            border: `1px solid var(--accent)`,
            borderRadius: theme.radius,
            fontSize: 12,
            fontWeight: 600,
            maxWidth: 240,
            padding: "8px 12px",
            lineHeight: 1.5,
            zIndex: 9999,
            boxShadow: theme.shadow,
            opacity: 1,
          }}
        />,
        document.body
      )}
    </>
  );
};
