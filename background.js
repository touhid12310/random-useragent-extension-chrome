function getNextUserAgent(callback) {
  chrome.storage.local.get({ userAgentIndex: 0 }, (result) => {
    loadUserAgents((userAgents) => {
      let userAgentIndex = result.userAgentIndex;

      if (userAgents.length > 0) {
        const nextUserAgent = userAgents[userAgentIndex];
        // Update the index for the next call
        userAgentIndex = (userAgentIndex + 1) % userAgents.length;
        chrome.storage.local.set({ userAgentIndex: userAgentIndex }, () => {
          callback(nextUserAgent);
        });
      } else {
        callback(null);
      }
    });
  });
}

function setSerialUserAgentRule() {
  getNextUserAgent((nextUserAgent) => {
    if (nextUserAgent) {
      const rule = {
        id: 1,
        priority: 1,
        action: {
          type: "modifyHeaders",
          requestHeaders: [
            { header: "User-Agent", operation: "set", value: nextUserAgent },
          ],
        },
        condition: {
          urlFilter: "*",
          resourceTypes: ["main_frame", "sub_frame"],
        },
      };

      chrome.declarativeNetRequest.updateDynamicRules(
        {
          removeRuleIds: [1],
          addRules: [rule],
        },
        () => {
          chrome.storage.local.set({ modifiedUserAgent: nextUserAgent });
          // console.log("User-Agent set to: ", nextUserAgent);
          chrome.runtime.sendMessage({
            action: "updateUserAgent",
            userAgent: nextUserAgent,
          });
          return true;
        }
      );
    } else {
      console.log("No User-Agent strings available.");
    }
  });
}

function removeUserAgentRule() {

  chrome.storage.local.remove("modifiedUserAgent");
  chrome.declarativeNetRequest.updateDynamicRules(
    { removeRuleIds: [1] },
    () => {
      console.log("User-Agent rule removed. Using default.");
    }
  );
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message === "changeUserAgent") {
    setSerialUserAgentRule();
  } else if (message === "useDefaultUserAgent") {
    removeUserAgentRule();
  }
  sendResponse(); // Always send a response
});

function loadUserAgents(callback) {
  const userAgents = [];
  const numChunks = 5000;

  const loadPromises = [];
  for (let i = 0; i < numChunks; i++) {
    const key = `userAgentsChunk${i}`;
    loadPromises.push(
      new Promise((resolve, reject) => {
        chrome.storage.local.get([key], (result) => {
          if (result[key]) {
            userAgents.push(...result[key]);
          }
          resolve();
        });
      })
    );
  }
  Promise.all(loadPromises)
    .then(() => {
      callback(userAgents);
    })
    .catch((error) => {
      console.error("Error loading User-Agents:", error);
    });
}
