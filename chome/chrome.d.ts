type ChromeTab = {
  id?: number;
};

declare const chrome:
  | {
      tabs?: {
        query(queryInfo: {active: boolean; currentWindow: boolean}): Promise<ChromeTab[]>;
      };
      scripting?: {
        executeScript<TResult>(details: {
          target: {tabId: number};
          func: () => TResult;
        }): Promise<Array<{result: TResult}>>;
      };
    }
  | undefined;
