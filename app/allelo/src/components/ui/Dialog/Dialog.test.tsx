import { render, screen, fireEvent } from '@testing-library/react';
import { Dialog } from './Dialog';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { Button } from '@mui/material';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface Matchers<R> {
      toBeInTheDocument(): R;
      toHaveClass(className: string): R;
      toHaveStyle(style: string | Record<string, unknown>): R;
      toBeDisabled(): R;
      toHaveAttribute(attr: string, value?: string): R;
    }
  }
}

const theme = createTheme();

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('Dialog', () => {
  const defaultProps = {
    open: true,
    onClose: jest.fn(),
    children: <div>Dialog content</div>,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders children correctly when open', () => {
    renderWithTheme(<Dialog {...defaultProps} />);
    
    expect(screen.getByText('Dialog content')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    renderWithTheme(<Dialog {...defaultProps} open={false} />);
    
    expect(screen.queryByText('Dialog content')).not.toBeInTheDocument();
  });

  it('forwards ref correctly', () => {
    const ref = { current: null };
    renderWithTheme(<Dialog {...defaultProps} ref={ref} />);
    
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it('renders title when provided', () => {
    renderWithTheme(
      <Dialog {...defaultProps} title="Test Dialog Title">
        Content
      </Dialog>
    );
    
    expect(screen.getByText('Test Dialog Title')).toBeInTheDocument();
  });

  it('renders close button when title is provided', () => {
    renderWithTheme(
      <Dialog {...defaultProps} title="Test Title">
        Content
      </Dialog>
    );
    
    const closeButton = screen.getByRole('button', { name: /close/i });
    expect(closeButton).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = jest.fn();
    renderWithTheme(
      <Dialog {...defaultProps} onClose={onClose} title="Test Title">
        Content
      </Dialog>
    );
    
    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);
    
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders actions when provided', () => {
    const actions = (
      <>
        <Button>Cancel</Button>
        <Button>Save</Button>
      </>
    );
    
    renderWithTheme(
      <Dialog {...defaultProps} actions={actions}>
        Content
      </Dialog>
    );
    
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
  });

  it('shows loading progress bar when loading is true', () => {
    renderWithTheme(
      <Dialog {...defaultProps} loading>
        Content
      </Dialog>
    );
    
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('does not show loading progress bar when loading is false', () => {
    renderWithTheme(
      <Dialog {...defaultProps} loading={false}>
        Content
      </Dialog>
    );
    
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('applies maxWidth prop correctly', () => {
    renderWithTheme(
      <Dialog {...defaultProps} maxWidth="lg">
        Content
      </Dialog>
    );
    
    const paper = document.querySelector('.MuiDialog-paper') as HTMLElement;
    expect(paper).toHaveClass('MuiDialog-paperWidthLg');
  });

  it('applies fullWidth prop correctly', () => {
    renderWithTheme(
      <Dialog {...defaultProps} fullWidth>
        Content
      </Dialog>
    );
    
    const paper = document.querySelector('.MuiDialog-paper') as HTMLElement;
    expect(paper).toHaveClass('MuiDialog-paperFullWidth');
  });

  it('has dividers on content when title is present', () => {
    renderWithTheme(
      <Dialog {...defaultProps} title="With Title">
        Content
      </Dialog>
    );
    
    const dialogContent = document.querySelector('.MuiDialogContent-root') as HTMLElement;
    expect(dialogContent).toHaveClass('MuiDialogContent-dividers');
  });

  it('does not have dividers on content when title is not present', () => {
    renderWithTheme(
      <Dialog {...defaultProps}>
        Content
      </Dialog>
    );
    
    const dialogContent = document.querySelector('.MuiDialogContent-root') as HTMLElement;
    expect(dialogContent).not.toHaveClass('MuiDialogContent-dividers');
  });

  it('renders complex title as ReactNode', () => {
    const complexTitle = (
      <div>
        <span>Complex</span> <strong>Title</strong>
      </div>
    );
    
    renderWithTheme(
      <Dialog {...defaultProps} title={complexTitle}>
        Content
      </Dialog>
    );
    
    expect(screen.getByText('Complex')).toBeInTheDocument();
    expect(screen.getByText('Title')).toBeInTheDocument();
  });

  it('passes through other MUI Dialog props', () => {
    renderWithTheme(
      <Dialog 
        {...defaultProps} 
        disableEscapeKeyDown
        data-testid="custom-dialog"
      >
        Content
      </Dialog>
    );
    
    expect(screen.getByTestId('custom-dialog')).toBeInTheDocument();
  });

  it('handles keyboard escape correctly with default behavior', () => {
    const onClose = jest.fn();
    renderWithTheme(
      <Dialog {...defaultProps} onClose={onClose}>
        Content
      </Dialog>
    );
    
    const dialog = screen.getByRole('dialog');
    fireEvent.keyDown(dialog, { key: 'Escape', code: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });
});