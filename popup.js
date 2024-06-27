document.addEventListener("DOMContentLoaded", () => {
  // Load stored User-Agent strings into the textarea
  // chrome.storage.local.get({ userAgents: [] }, (result) => {
  //   console.log(result);
  //   const userAgents = result.userAgents;
  //   document.getElementById("user-agent-input").value = userAgents.join("\n");
  // });

  // Set up event listener for changing User-Agent
  document.getElementById("change-user-agent").addEventListener("click", () => {
    chrome.runtime.sendMessage("changeUserAgent", () => {
      alert("User-Agent changed!");
    });
  });

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log(message);
    if (message.action === "updateUserAgent") {
      document.getElementById("user-agent-show").value = message.userAgent;
    }
  });

  document
    .getElementById("use-default-user-agent")
    .addEventListener("click", () => {
      chrome.runtime.sendMessage("useDefaultUserAgent", () => {
        alert("User-Agent reset to default!");
      });
    });

  // Set up event listener for adding new User-Agent strings
  // document.getElementById("add-user-agent").addEventListener("click", () => {
    // chrome.storage.local.get({ userAgents: [] }, (result) => {
    //   console.log(result);
    // })

    // return;

    const userAgentInput = document
      .getElementById("user-agent-input")
      .value.trim();

    if (userAgentInput) {
      chrome.storage.local.clear(); // Clear old data

      const newUserAgents = userAgentInput
        .split("\n")
        .map((ua) => ua.trim())
        .filter((ua) => ua);

      const chunkSize = 5000; // Adjust chunk size if needed
      const numChunks = Math.ceil(newUserAgents.length / chunkSize);

      // Use Promise.all to wait for all chunks to be saved
      const savePromises = [];
      for (let i = 0; i < numChunks; i++) {
        const start = i * chunkSize;
        const end = (i + 1) * chunkSize;
        const chunk = newUserAgents.slice(start, end);
        const key = `userAgentsChunk${i}`;

        savePromises.push(
          new Promise((resolve, reject) => {
            chrome.storage.local.set({ [key]: chunk }, () => {
              if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
              } else {
                resolve();
              }
            });
          })
        );
      }

      // Also save the initial userAgentIndex
      savePromises.push(
        new Promise((resolve, reject) => {
          chrome.storage.local.set({ userAgentIndex: 0 }, () => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
            } else {
              resolve();
            }
          });
        })
      );

      Promise.all(savePromises)
        .then(() => {
          alert("User-Agent(s) added!");
          document.getElementById("user-agent-input").value =
            newUserAgents.join("\n");
        })
        .catch((error) => {
          console.error("Error saving User-Agents:", error);
          alert(
            "An error occurred while saving User-Agents. Please try again."
          );
        });
    } else {
      alert("Please enter at least one User-Agent string.");
    }
  });

  // Function to retrieve User-Agent strings
  function loadUserAgents() {
    const userAgents = [];
    const numChunks = Math.ceil(
      document.getElementById("user-agent-input").value.trim().split("\n")
        .length / 5000
    );

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
        document.getElementById("user-agent-input").value =
          userAgents.join("\n");

        // const userAgent = navigator.userAgent;
        // document.getElementById("user-agent-show").value =  navigator.userAgent;;

        chrome.storage.local.get("modifiedUserAgent", (data) => {
          const modifiedUserAgent = data.modifiedUserAgent;
          if (modifiedUserAgent) {
            document.getElementById("user-agent-show").value =
              modifiedUserAgent;
          }
        });
      })
      .catch((error) => {
        console.error("Error loading User-Agents:", error);
      });
  }

  // Call the loadUserAgents function initially to populate the textarea on page load
  loadUserAgents();
});
