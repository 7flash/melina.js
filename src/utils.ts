export type MeasureContext = {
    requestId?: string;
    level?: number;
    idChain?: string[];
};

type MeasureFn = <T>(
    fn: (measure: MeasureFn) => Promise<T>,
    action: string | Record<string, any>,
    context?: MeasureContext
) => Promise<T>;

export const measure: MeasureFn = async function <T>(
    fn: (measure: MeasureFn) => Promise<T>,
    action: string | Record<string, any>,
    context: MeasureContext = {}
): Promise<T> {
    const start = performance.now();
    const currentId = Math.random().toString(36).substring(2, 8);
    const parentIdChain = (context.idChain || []).map(id => `[${id}]`).join('');
    const fullIdChain = [...(context.idChain || []), currentId].map(id => `[${id}]`).join('');

    try {
        const actionLabel = typeof action === 'object' && action !== null && 'label' in action
            ? String(action.label)
            : typeof action === 'object'
                ? String(action)
                : action;

        if (parentIdChain) {
            console.log(`> ${parentIdChain} ${actionLabel} (${currentId})`);
        } else {
            console.log(`> ${actionLabel} (${currentId})`);
        }

        if (typeof action === 'object' && action !== null) {
            const { label: _, ...rest } = action;
            if (Object.keys(rest).length > 0) {
                console.table(rest);
            }
        }

        const result = await fn((nestedFn: (measure: MeasureFn) => Promise<any>, nestedAction: string | Record<string, any>) =>
            measure(nestedFn, nestedAction, {
                ...context,
                idChain: [...(context.idChain || []), currentId],
                level: (context.level || 0) + 1,
            })
        );

        const duration = performance.now() - start;
        console.log(`< ${fullIdChain} ✓ ${duration.toFixed(2)}ms`);
        return result;
    } catch (error) {
        const duration = performance.now() - start;
        console.log(`< ${fullIdChain} ✗ FAILED ${duration.toFixed(2)}ms`);
        if (error instanceof Error) {
            console.error(`${fullIdChain}`, error.stack ?? error.message);
        } else {
            console.error(`${fullIdChain}`, error);
        }
        return null as unknown as T;
    }
};
