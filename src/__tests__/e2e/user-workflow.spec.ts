import { test, expect } from '@playwright/test';

test.describe('Literature Synthesizer User Workflows', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/workspace');
  });

  test('complete user workflow: upload → chat → export', async ({ page }) => {
    // Step 1: Upload documents
    await test.step('Upload documents', async () => {
      // Check initial empty state
      await expect(page.getByText('No sources yet')).toBeVisible();
      await expect(page.getByText('Upload documents to get started')).toBeVisible();

      // Mock file upload (since we can't actually upload files in tests)
      await page.route('/api/documents/upload', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            sourceId: 'test-doc-1',
            status: 'processing',
            estimatedTime: 30000,
          }),
        });
      });

      // Mock document status updates
      await page.route('/api/documents/*/status', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'test-doc-1',
            status: 'ready',
            progress: 100,
          }),
        });
      });

      // Simulate document being added to the sources rail
      await page.evaluate(() => {
        // Add mock source to store
        const { useAppStore } = window as any;
        if (useAppStore) {
          useAppStore.getState().addSource({
            title: 'Test Research Paper',
            status: 'ready',
            progress: 100,
            selected: false,
            tags: ['research', 'test'],
          });
        }
      });

      // Verify document appears in sources rail
      await expect(page.getByText('Test Research Paper')).toBeVisible();
      await expect(page.getByText('Ready')).toBeVisible();
    });

    // Step 2: Select sources and chat
    await test.step('Select sources and chat', async () => {
      // Select the document
      const sourceCheckbox = page.locator('[data-testid="source-checkbox"]').first();
      await sourceCheckbox.check();

      // Verify source is selected
      await expect(page.getByText('Chatting with 1 sources:')).toBeVisible();
      await expect(page.getByText('Test Research Paper')).toBeVisible();

      // Mock chat API
      await page.route('/api/chat', async route => {
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
          start(controller) {
            const chunks = [
              { type: 'token', data: 'Based on your research paper, ', messageId: 'msg-1' },
              { type: 'token', data: 'the key findings include...', messageId: 'msg-1' },
              { 
                type: 'artefact', 
                data: {
                  id: 'moa',
                  type: 'moa',
                  title: 'MoA Brief',
                  bullets: ['Key mechanism 1', 'Key mechanism 2'],
                  status: 'ready',
                  metadata: { sources: 1 }
                }, 
                messageId: 'msg-1' 
              },
              { type: 'complete', data: '', messageId: 'msg-1' },
            ];
            
            chunks.forEach((chunk, index) => {
              setTimeout(() => {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
                if (index === chunks.length - 1) {
                  controller.close();
                }
              }, index * 100);
            });
          },
        });
        
        await route.fulfill({
          status: 200,
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          },
          body: stream,
        });
      });

      // Type and send message
      const chatInput = page.getByPlaceholderText('Ask a question about your sources...');
      await chatInput.fill('What are the key findings in this research?');
      await page.getByRole('button', { name: 'Send' }).click();

      // Verify message appears
      await expect(page.getByText('What are the key findings in this research?')).toBeVisible();
      
      // Wait for streaming response
      await expect(page.getByText('Based on your research paper, the key findings include...')).toBeVisible();
    });

    // Step 3: Verify insights generation
    await test.step('Verify insights generation', async () => {
      // Check that insight cards are updated
      await expect(page.getByText('MoA Brief')).toBeVisible();
      await expect(page.getByText('Key mechanism 1')).toBeVisible();
      await expect(page.getByText('Key mechanism 2')).toBeVisible();
      
      // Check insight panel status
      await expect(page.getByText('1 of 3 insights ready')).toBeVisible();
    });

    // Step 4: Export artefact
    await test.step('Export artefact', async () => {
      // Mock download
      const downloadPromise = page.waitForEvent('download');
      
      // Click download button on MoA card
      await page.getByTitle('Download').first().click();
      
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(/moa-brief\.md$/);
    });
  });

  test('article search workflow', async ({ page }) => {
    await test.step('Search for articles', async () => {
      // Mock article search API
      await page.route('/api/articles/search*', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            results: [
              {
                id: 'article-1',
                title: 'Machine Learning in Healthcare',
                abstract: 'This paper explores the applications of ML...',
                authors: ['Dr. Smith', 'Dr. Johnson'],
                journal: 'Nature Medicine',
                publicationDate: '2024-01-01T00:00:00Z',
                relevanceScore: 0.95,
                searchLabel: 'highly_relevant',
              },
              {
                id: 'article-2',
                title: 'Recent Advances in AI',
                abstract: 'Recent developments in artificial intelligence...',
                authors: ['Dr. Brown'],
                journal: 'Science',
                publicationDate: '2024-01-15T00:00:00Z',
                relevanceScore: 0.87,
                searchLabel: 'most_recent',
              },
            ],
            total: 2,
            query: 'machine learning healthcare',
          }),
        });
      });

      // Type search query in chat
      const chatInput = page.getByPlaceholderText('Search for articles or select sources to chat...');
      await chatInput.fill('Find articles about machine learning in healthcare');
      await page.getByRole('button', { name: 'Send' }).click();

      // Verify search results appear in sources rail
      await expect(page.getByText('Machine Learning in Healthcare')).toBeVisible();
      await expect(page.getByText('Recent Advances in AI')).toBeVisible();
      await expect(page.getByText('highly_relevant')).toBeVisible();
      await expect(page.getByText('most_recent')).toBeVisible();
    });
  });

  test('responsive behavior', async ({ page }) => {
    await test.step('Test desktop layout', async () => {
      await page.setViewportSize({ width: 1400, height: 900 });
      
      // Verify three-column layout
      await expect(page.locator('[data-testid="sources-rail"]')).toBeVisible();
      await expect(page.locator('[data-testid="chat-panel"]')).toBeVisible();
      await expect(page.locator('[data-testid="insight-panel"]')).toBeVisible();
    });

    await test.step('Test tablet layout', async () => {
      await page.setViewportSize({ width: 1000, height: 700 });
      
      // Insight panel should be collapsible
      const toggleButton = page.getByTitle('Toggle insight panel');
      await expect(toggleButton).toBeVisible();
      
      // Click to collapse
      await toggleButton.click();
      await expect(page.locator('[data-testid="insight-panel"]')).toBeHidden();
      
      // Click to expand
      await toggleButton.click();
      await expect(page.locator('[data-testid="insight-panel"]')).toBeVisible();
    });

    await test.step('Test mobile layout', async () => {
      await page.setViewportSize({ width: 375, height: 667 });
      
      // Should show stacked layout
      await expect(page.locator('[data-testid="sources-rail"]')).toBeVisible();
      await expect(page.locator('[data-testid="chat-panel"]')).toBeVisible();
      
      // Insights should be in bottom sheet
      const insightButton = page.getByText('View Insights');
      if (await insightButton.isVisible()) {
        await insightButton.click();
        await expect(page.locator('[data-testid="bottom-sheet"]')).toBeVisible();
      }
    });
  });

  test('theme switching', async ({ page }) => {
    await test.step('Switch to dark theme', async () => {
      const themeToggle = page.getByTitle('Toggle theme');
      await themeToggle.click();
      
      // Verify dark theme is applied
      await expect(page.locator('html')).toHaveClass(/dark/);
      
      // Switch back to light theme
      await themeToggle.click();
      await expect(page.locator('html')).not.toHaveClass(/dark/);
    });
  });

  test('error handling', async ({ page }) => {
    await test.step('Handle API errors gracefully', async () => {
      // Mock API error
      await page.route('/api/chat', async route => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal server error' }),
        });
      });

      // Add a source first
      await page.evaluate(() => {
        const { useAppStore } = window as any;
        if (useAppStore) {
          useAppStore.getState().addSource({
            title: 'Test Document',
            status: 'ready',
            progress: 100,
            selected: true,
            tags: [],
          });
        }
      });

      // Try to send a message
      const chatInput = page.getByPlaceholderText('Ask a question about your sources...');
      await chatInput.fill('Test message');
      await page.getByRole('button', { name: 'Send' }).click();

      // Verify error message appears
      await expect(page.getByText(/error/i)).toBeVisible();
      await expect(page.getByText(/try again/i)).toBeVisible();
    });

    await test.step('Handle network connectivity issues', async () => {
      // Simulate offline mode
      await page.context().setOffline(true);
      
      // Try to perform an action
      const chatInput = page.getByPlaceholderText(/search for articles/i);
      await chatInput.fill('Test offline');
      
      // Should show offline indicator
      await expect(page.getByText(/offline/i)).toBeVisible();
      
      // Restore connectivity
      await page.context().setOffline(false);
      await expect(page.getByText(/online/i)).toBeVisible();
    });
  });

  test('source management', async ({ page }) => {
    await test.step('Filter and search sources', async () => {
      // Add multiple sources
      await page.evaluate(() => {
        const { useAppStore } = window as any;
        if (useAppStore) {
          const store = useAppStore.getState();
          store.addSources([
            {
              title: 'Machine Learning Paper',
              status: 'ready',
              progress: 100,
              selected: false,
              tags: ['ML', 'research'],
            },
            {
              title: 'Deep Learning Study',
              status: 'ready',
              progress: 100,
              selected: false,
              tags: ['DL', 'neural-networks'],
            },
            {
              title: 'AI Ethics Review',
              status: 'ready',
              progress: 100,
              selected: false,
              tags: ['ethics', 'AI'],
            },
          ]);
        }
      });

      // Test search functionality
      const searchInput = page.getByPlaceholderText('Search sources...');
      await searchInput.fill('Machine');
      
      await expect(page.getByText('Machine Learning Paper')).toBeVisible();
      await expect(page.getByText('Deep Learning Study')).toBeHidden();
      
      // Clear search
      await searchInput.clear();
      await expect(page.getByText('Deep Learning Study')).toBeVisible();

      // Test tag filtering
      const filterButton = page.getByTitle('Filter by tags');
      await filterButton.click();
      
      const mlTag = page.getByText('ML');
      await mlTag.click();
      
      await expect(page.getByText('Machine Learning Paper')).toBeVisible();
      await expect(page.getByText('AI Ethics Review')).toBeHidden();
    });

    await test.step('Select and manage sources', async () => {
      // Select all sources
      const selectAllCheckbox = page.getByText('Select all').locator('input');
      await selectAllCheckbox.check();
      
      // Verify selection count
      await expect(page.getByText(/selected/)).toBeVisible();
      
      // Deselect all
      await selectAllCheckbox.uncheck();
      
      // Select individual source
      const firstSourceCheckbox = page.locator('[data-testid="source-checkbox"]').first();
      await firstSourceCheckbox.check();
      
      await expect(page.getByText('Chatting with 1 sources:')).toBeVisible();
    });
  });
});