"use client";

import { useEffect } from "react";

export default function PinterestMeta() {
  useEffect(() => {
    // Проверяем, есть ли уже этот тег
    const existingTag = document.querySelector('meta[name="p:domain_verify"]');
    
    if (!existingTag) {
      // Создаем новый meta-тег
      const metaTag = document.createElement("meta");
      metaTag.setAttribute("name", "p:domain_verify");
      metaTag.setAttribute("content", "db57b5002e17eb5680785647002de0b9");
      document.head.appendChild(metaTag);
    }
  }, []);

  return null;
}

