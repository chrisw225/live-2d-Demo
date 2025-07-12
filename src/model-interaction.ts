import { ipcRenderer } from 'electron';

// Model interaction controller class
export class ModelInteractionController {
    private model: any = null;
    private app: any = null;
    private interactionWidth: number = 0;
    private interactionHeight: number = 0;
    private interactionX: number = 0;
    private interactionY: number = 0;
    private isDragging: boolean = false;
    private dragOffset: { x: number; y: number } = { x: 0, y: 0 };

    constructor() {
        // Initialize
    }

    // Initialize model and app
    init(model: any, app: any): void {
        this.model = model;
        this.app = app;
        this.updateInteractionArea();
        this.setupInteractivity();
    }

    // Update interaction area size and position
    updateInteractionArea(): void {
        if (!this.model) return;
        
        this.interactionWidth = this.model.width / 3;
        this.interactionHeight = this.model.height * 0.7;
        this.interactionX = this.model.x + (this.model.width - this.interactionWidth) / 2;
        this.interactionY = this.model.y + (this.model.height - this.interactionHeight) / 2;
    }

    // Setup interactivity
    setupInteractivity(): void {
        if (!this.model) return;
        
        this.model.interactive = true;

        // Track mouse position globally
        let mousePosition = { x: 0, y: 0 };
        document.addEventListener('mousemove', (e) => {
            mousePosition.x = e.clientX;
            mousePosition.y = e.clientY;
        });

        // Override the original containsPoint method, customize interaction area
        this.model.containsPoint = (point: any) => {
            const isOverModel = (
                this.model && // Ensure model is loaded
                point.x >= this.interactionX &&
                point.x <= this.interactionX + this.interactionWidth &&
                point.y >= this.interactionY &&
                point.y <= this.interactionY + this.interactionHeight
            );
            return isOverModel;
        };

        // Check if mouse is over model and update click-through accordingly
        const checkMousePosition = () => {
            const isOverModel = this.model.containsPoint(mousePosition);
            
            // Send appropriate message to main process
            ipcRenderer.send('set-ignore-mouse-events', {
                ignore: !isOverModel,
                options: { forward: true }
            });
        };

        // Update mouse position checking regularly
        setInterval(checkMousePosition, 100);

        // Mouse down event
        document.addEventListener('mousedown', (e) => {
            const point = { x: e.clientX, y: e.clientY };
            if (this.model.containsPoint(point)) {
                this.isDragging = true;
                this.dragOffset.x = point.x - this.model.x;
                this.dragOffset.y = point.y - this.model.y;
                
                // Disable mouse events pass-through during drag
                ipcRenderer.send('set-ignore-mouse-events', {
                    ignore: false
                });
            }
        });

        // Mouse move event
        document.addEventListener('mousemove', (e) => {
            if (this.isDragging) {
                const newX = e.clientX - this.dragOffset.x;
                const newY = e.clientY - this.dragOffset.y;
                this.model.position.set(newX, newY);
                this.updateInteractionArea();
            }
        });

        // Mouse release event
        document.addEventListener('mouseup', () => {
            if (this.isDragging) {
                this.isDragging = false;
                
                // Re-enable mouse events pass-through after drag
                setTimeout(() => {
                    if (!this.model.containsPoint(mousePosition)) {
                        ipcRenderer.send('set-ignore-mouse-events', {
                            ignore: true,
                            options: { forward: true }
                        });
                    }
                }, 100);
            }
        });

        // Mouse click event
        document.addEventListener('click', (e) => {
            const point = { x: e.clientX, y: e.clientY };
            if (this.model.containsPoint(point) && this.model.internalModel) {
                this.model.motion("Tap");
                this.model.expression();
            }
        });

        // Mouse wheel event (scaling functionality)
        document.addEventListener('wheel', (e: WheelEvent) => {
            const point = { x: e.clientX, y: e.clientY };
            if (this.model.containsPoint(point)) {
                e.preventDefault();

                const scaleChange = e.deltaY > 0 ? 0.9 : 1.1;
                const currentScale = this.model.scale.x;
                const newScale = currentScale * scaleChange;

                const minScale = 0.3;
                const maxScale = 3.0;

                if (newScale >= minScale && newScale <= maxScale) {
                    this.model.scale.set(newScale);

                    const oldWidth = this.model.width / scaleChange;
                    const oldHeight = this.model.height / scaleChange;
                    const deltaWidth = this.model.width - oldWidth;
                    const deltaHeight = this.model.height - oldHeight;

                    this.model.x -= deltaWidth / 2;
                    this.model.y -= deltaHeight / 2;
                    this.updateInteractionArea();
                }
            }
        }, { passive: false });

        // Window resize event
        window.addEventListener('resize', () => {
            if (this.app) {
                this.updateInteractionArea();
            }
        });

        console.log('🎮 Character interaction enabled: drag to move, scroll to scale');
    }

    // Setup initial model properties
    setupInitialModelProperties(scaleMultiplier: number = 2.3): void {
        if (!this.model || !this.app) return;
        
        const scaleX = (window.innerWidth * scaleMultiplier) / this.model.width;
        const scaleY = (window.innerHeight * scaleMultiplier) / this.model.height;
        this.model.scale.set(Math.min(scaleX, scaleY));

        this.model.y = window.innerHeight * 0.8;
        this.model.x = window.innerWidth * 1.35;
        this.updateInteractionArea();
    }
} 