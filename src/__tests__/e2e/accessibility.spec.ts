import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/workspace');
  });

  test('should not have any automatically detectable accessibility issues', async ({ page }) => {
    // Add some sample data to test with content
    await page.evaluate(() => {
      const { useAppStore } = window as any;
      if (useAppStore) {
        const store = useAppStore.getState();
        
        // Add sources
        store.addSources([
          {
            title: 'Research Paper 1',
            status: 'ready',
            progress: 100,
            selected: false,
            tags: ['research'],
          },
          {
            title: 'Study Document 2',
            status: 'embedding',
            progress: 75,
            selected: false,
            tags: ['study'],
          },
        ]);
        
        // Add messages
        store.addMessage({
          role: 'user',
          content: 'What are the key findings?',
          sourceIds: ['1'],
        });
        
        store.addMessage({
          role: 'assistant',
          content: 'Based on the analysis of your sources...',
          sourceIds: ['1'],
        });
        
        // Update artefacts
        store.updateArtefact('moa', {
          bullets: ['Key finding 1', 'Key finding 2'],
          status: 'ready',
        });
      }
    });

    // Wait for content to load
    await expect(page.getByText('Research Paper 1')).toBeVisible();

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('keyboard navigation should work correctly', async ({ page }) => {
    // Add sample sources
    await page.evaluate(() => {
      const { useAppStore } = window as any;
      if (useAppStore) {
        useAppStore.getState().addSources([
          {
            title: 'Test Document 1',
            status: 'ready',
            progress: 100,
            selected: false,
            tags: ['test'],
          },
          {
            title: 'Test Document 2',
            status: 'ready',
            progress: 100,
            selected: false,
            tags: ['test'],
          },
        ]);
      }
    });

    await expect(page.getByText('Test Document 1')).toBeVisible();

    // Test tab navigation through sources
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    // Should be able to navigate to source checkboxes
    const firstCheckbox = page.locator('[data-testid="source-checkbox"]').first();
    await expect(firstCheckbox).toBeFocused();
    
    // Should be able to select with space
    await page.keyboard.press('Space');
    await expect(firstCheckbox).toBeChecked();
    
    // Navigate to chat input
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    const chatInput = page.getByPlaceholderText('Ask a question about your sources...');
    await expect(chatInput).toBeFocused();
    
    // Should be able to type
    await page.keyboard.type('Test message');
    await expect(chatInput).toHaveValue('Test message');
    
    // Navigate to send button
    await page.keyboard.press('Tab');
    const sendButton = page.getByRole('button', { name: 'Send' });
    await expect(sendButton).toBeFocused();
  });

  test('screen reader support', async ({ page }) => {
    // Add sample content
    await page.evaluate(() => {
      const { useAppStore } = window as any;
      if (useAppStore) {
        const store = useAppStore.getState();
        store.addSource({
          title: 'Accessible Document',
          status: 'ready',
          progress: 100,
          selected: false,
          tags: ['accessibility'],
        });
        
        store.updateArtefact('moa', {
          bullets: ['Accessible insight 1', 'Accessible insight 2'],
          status: 'ready',
        });
      }
    });

    // Check for proper ARIA labels and roles
    await expect(page.getByRole('main')).toBeVisible();
    await expect(page.getByRole('navigation')).toBeVisible();
    
    // Check source list has proper labeling
    const sourcesList = page.getByRole('list').first();
    await expect(sourcesList).toHaveAttribute('aria-label', /sources/i);
    
    // Check checkboxes have proper labels
    const sourceCheckbox = page.locator('[data-testid="source-checkbox"]').first();
    await expect(sourceCheckbox).toHaveAttribute('aria-label');
    
    // Check buttons have accessible names
    const themeToggle = page.getByTitle('Toggle theme');
    await expect(themeToggle).toHaveAttribute('aria-label');
    
    // Check form controls are properly labeled
    const searchInput = page.getByPlaceholderText('Search sources...');
    await expect(searchInput).toHaveAttribute('aria-label');
    
    const chatInput = page.getByPlaceholderText(/ask a question/i);
    await expect(chatInput).toHaveAttribute('aria-label');
  });

  test('color contrast and visual accessibility', async ({ page }) => {
    // Test both light and dark themes
    for (const theme of ['light', 'dark']) {
      await test.step(`Test ${theme} theme contrast`, async () => {
        if (theme === 'dark') {
          await page.getByTitle('Toggle theme').click();
          await expect(page.locator('html')).toHaveClass(/dark/);
        }

        // Add content to test
        await page.evaluate(() => {
          const { useAppStore } = window as any;
          if (useAppStore) {
            const store = useAppStore.getState();
            store.addSource({
              title: 'Contrast Test Document',
              status: 'ready',
              progress: 100,
              selected: false,
              tags: ['contrast'],
            });
          }
        });

        // Run accessibility scan focusing on color contrast
        const accessibilityScanResults = await new AxeBuilder({ page })
          .withTags(['wcag2aa'])
          .include('body')
          .analyze();

        // Filter for color contrast violations
        const contrastViolations = accessibilityScanResults.violations.filter(
          violation => violation.id === 'color-contrast'
        );

        expect(contrastViolations).toEqual([]);
      });
    }
  });

  test('focus management and visual indicators', async ({ page }) => {
    // Add sample content
    await page.evaluate(() => {
      const { useAppStore } = window as any;
      if (useAppStore) {
        useAppStore.getState().addSource({
          title: 'Focus Test Document',
          status: 'ready',
          progress: 100,
          selected: false,
          tags: ['focus'],
        });
      }
    });

    // Test focus indicators are visible
    const firstCheckbox = page.locator('[data-testid="source-checkbox"]').first();
    await firstCheckbox.focus();
    
    // Check that focus indicator is visible (this would need custom CSS testing)
    await expect(firstCheckbox).toBeFocused();
    
    // Test modal focus management
    const expandButton = page.getByTitle('Expand details').first();
    if (await expandButton.isVisible()) {
      await expandButton.click();
      
      // Focus should be trapped in modal
      const modal = page.locator('[role="dialog"]');
      await expect(modal).toBeVisible();
      
      // Close modal and verify focus returns
      await page.keyboard.press('Escape');
      await expect(modal).toBeHidden();
      await expect(expandButton).toBeFocused();
    }
  });

  test('responsive accessibility', async ({ page }) => {
    // Test accessibility across different viewport sizes
    const viewports = [
      { width: 1400, height: 900, name: 'desktop' },
      { width: 1000, height: 700, name: 'tablet' },
      { width: 375, height: 667, name: 'mobile' },
    ];

    for (const viewport of viewports) {
      await test.step(`Test ${viewport.name} accessibility`, async () => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        
        // Add content
        await page.evaluate(() => {
          const { useAppStore } = window as any;
          if (useAppStore) {
            useAppStore.getState().addSource({
              title: `${viewport.name} Test Document`,
              status: 'ready',
              progress: 100,
              selected: false,
              tags: ['responsive'],
            });
          }
        });

        // Run accessibility scan
        const accessibilityScanResults = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa'])
          .analyze();

        expect(accessibilityScanResults.violations).toEqual([]);
        
        // Test that interactive elements are still accessible
        const searchInput = page.getByPlaceholderText('Search sources...');
        await expect(searchInput).toBeVisible();
        await expect(searchInput).toHaveAttribute('aria-label');
      });
    }
  });

  test('error states accessibility', async ({ page }) => {
    // Simulate error states
    await page.evaluate(() => {
      const { useAppStore } = window as any;
      if (useAppStore) {
        const store = useAppStore.getState();
        
        // Add source with error
        store.addSource({
          title: 'Failed Document',
          status: 'error',
          progress: 0,
          selected: false,
          tags: [],
          errorMessage: 'Processing failed',
        });
        
        // Set global error
        store.setError(new Error('Network error'), { operation: 'upload' });
      }
    });

    // Check error messages are accessible
    const errorMessage = page.getByText('Processing failed');
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toHaveAttribute('role', 'alert');
    
    // Check retry buttons are accessible
    const retryButton = page.getByText('Try Again');
    if (await retryButton.isVisible()) {
      await expect(retryButton).toHaveAttribute('aria-label');
    }
    
    // Run accessibility scan on error states
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('loading states accessibility', async ({ page }) => {
    // Simulate loading states
    await page.evaluate(() => {
      const { useAppStore } = window as any;
      if (useAppStore) {
        const store = useAppStore.getState();
        
        // Add source with loading state
        store.addSource({
          title: 'Loading Document',
          status: 'embedding',
          progress: 50,
          selected: false,
          tags: [],
        });
        
        // Set global loading
        store.setLoading(true, 'processing', 75, 'Processing documents...');
      }
    });

    // Check loading indicators are accessible
    const progressBar = page.locator('[role="progressbar"]');
    if (await progressBar.isVisible()) {
      await expect(progressBar).toHaveAttribute('aria-valuenow');
      await expect(progressBar).toHaveAttribute('aria-valuemin');
      await expect(progressBar).toHaveAttribute('aria-valuemax');
    }
    
    // Check loading messages are announced
    const loadingMessage = page.getByText('Processing documents...');
    if (await loadingMessage.isVisible()) {
      await expect(loadingMessage).toHaveAttribute('aria-live');
    }
    
    // Run accessibility scan on loading states
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('form accessibility', async ({ page }) => {
    // Test form controls accessibility
    const searchInput = page.getByPlaceholderText('Search sources...');
    await expect(searchInput).toHaveAttribute('aria-label');
    await expect(searchInput).toHaveAttribute('type', 'text');
    
    const chatInput = page.getByPlaceholderText(/search for articles/i);
    await expect(chatInput).toHaveAttribute('aria-label');
    
    // Test form validation accessibility
    await chatInput.focus();
    await page.keyboard.press('Enter'); // Try to submit empty form
    
    // Should show validation message
    const validationMessage = page.getByText(/required/i);
    if (await validationMessage.isVisible()) {
      await expect(validationMessage).toHaveAttribute('role', 'alert');
    }
    
    // Run accessibility scan on form states
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });
});