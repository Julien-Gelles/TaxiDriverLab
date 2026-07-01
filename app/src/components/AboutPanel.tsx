import { useTranslation } from "react-i18next";

import { useSimConfig } from "../hooks";
import {
  AboutDescription,
  AboutImg,
  AboutRow,
  AboutText,
  AboutTitle,
} from "../styles";
import taxiImg from "../assets/taxi.webp";
import taxiDemoImg from "../assets/taxi-demo.webp";

export const AboutPanel = () => {
  const { t } = useTranslation();
  const { mode } = useSimConfig();
  const img = mode === "demo" ? taxiDemoImg : taxiImg;
  return (
    <AboutRow>
      <AboutImg src={img} alt="Taxi" />
      <AboutText>
        <AboutTitle>{t("about.title")}</AboutTitle>
        <AboutDescription>{t("about.description")}</AboutDescription>
      </AboutText>
    </AboutRow>
  );
};
