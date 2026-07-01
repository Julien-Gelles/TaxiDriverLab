import { useEffect, useState } from "react";

export const useIsPortrait = (): boolean => {
  const [isPortrait, setIsPortrait] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return window.innerHeight > window.innerWidth;
    }
    return false;
  });

  useEffect(() => {
    const handleResize = () => {
      setIsPortrait(window.innerHeight > window.innerWidth);
    };

    window.addEventListener("resize", handleResize);
    handleResize();

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return isPortrait;
};
