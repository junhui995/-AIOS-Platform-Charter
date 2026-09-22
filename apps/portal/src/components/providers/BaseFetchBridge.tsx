"use client";

import { useEffect } from 'react';

const BASE_PATH = '/aios';

export default function BaseFetchBridge() {
  useEffect(() => {
    const origFetch = window.fetch.bind(window);
    window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
      if (typeof input === 'string' && input.startsWith('/api')) {
        input = `${BASE_PATH}${input}`;
      } else if (input instanceof URL && input.origin === window.location.origin) {
        if (input.pathname.startsWith('/api')) {
          const url = new URL(input.href);
          url.pathname = `${BASE_PATH}${url.pathname}`;
          input = url;
        }
      }
      return origFetch(input, init);
    }) as typeof fetch;
  }, []);

  return null;
}