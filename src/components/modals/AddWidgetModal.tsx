'use client';

import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Code } from 'lucide-react';
import { toast } from 'sonner';
import { Widget } from '@/types';
import { WIDGET_PRESETS } from '@/lib/widgetPresets';
import styles from './AddWidgetModal.module.css';

interface AddWidgetModalProps {
    onClose: () => void;
    onSave: (widget: Widget) => void;
    initialData?: Widget | null;
}

interface FieldConfig {
    label: string;
    path: string;
    suffix?: string;
    format?: 'number' | 'bytes' | 'percent' | 'string';
}

export default function AddWidgetModal({ onClose, onSave, initialData }: AddWidgetModalProps) {
    const [isJsonMode, setIsJsonMode] = useState(false);
    const [jsonError, setJsonError] = useState('');
    const [rawJson, setRawJson] = useState('');

    const [type, setType] = useState<Widget['type']>(initialData?.type || 'generic');
    const [title, setTitle] = useState(initialData?.title || '');
    // Generic options
    const [endpoint, setEndpoint] = useState(initialData?.options?.endpoint || '');
    const [fields, setFields] = useState<FieldConfig[]>(
        initialData?.options?.fields || [{ label: '', path: '' }]
    );

    // Initialize raw JSON when entering mode
    useEffect(() => {
        if (isJsonMode) {
            const currentData = {
                id: initialData?.id || 'temp-id', // Placeholder
                type,
                title,
                options: type === 'generic' ? { endpoint, fields: fields.filter(f => f.label && f.path) } : {}
            };
            setRawJson(JSON.stringify(currentData, null, 2));
            setJsonError('');
        }
    }, [isJsonMode]);

    const handleSwitchMode = () => {
        if (isJsonMode) {
            // Switch to form: Validation
            try {
                const parsed = JSON.parse(rawJson);
                setType(parsed.type);
                setTitle(parsed.title);
                if (parsed.type === 'generic' && parsed.options) {
                    setEndpoint(parsed.options.endpoint || '');
                    setFields(parsed.options.fields || [{ label: '', path: '' }]);
                }
                setIsJsonMode(false);
            } catch (e) {
                toast.error('Invalid JSON');
                setJsonError('Invalid JSON format');
            }
        } else {
            // Switch to JSON (handled by useEffect)
            setIsJsonMode(true);
        }
    };

    // Update title placeholder based on type
    useEffect(() => {
        if (!initialData && !title && !isJsonMode) {
            if (type === 'system-monitor') setTitle('System Monitor');
            if (type === 'docker') setTitle('Docker Stats');
            if (type === 'clock') setTitle('Clock');
            if (type === 'weather') setTitle('Weather');
        }
    }, [type, initialData, title, isJsonMode]);

    const handleApplyPreset = (presetId: string) => {
        const preset = WIDGET_PRESETS.find(p => p.id === presetId);
        if (preset) {
            setTitle(preset.name);
            setEndpoint(preset.defaultOptions.endpoint);
            // @ts-ignore
            setFields(preset.defaultOptions.fields);
            toast.success(`Applied ${preset.name} preset`);
        }
    };

    const handleAddField = () => {
        setFields([...fields, { label: '', path: '' }]);
    };

    const handleRemoveField = (index: number) => {
        setFields(fields.filter((_, i) => i !== index));
    };

    const handleFieldChange = (index: number, key: keyof FieldConfig, value: string) => {
        const newFields = [...fields];
        // @ts-ignore
        newFields[index][key] = value;
        setFields(newFields);
    };

    const handleSubmit = () => {
        let finalWidget: Widget;

        if (isJsonMode) {
            try {
                const parsed = JSON.parse(rawJson);
                if (!parsed.title) throw new Error('Title is required');
                // Ensure ID is preserved if editing
                finalWidget = {
                    ...parsed,
                    id: initialData?.id || parsed.id || `widget-${Date.now()}`
                };
            } catch (e: any) {
                toast.error(e.message || 'Invalid JSON');
                return;
            }
        } else {
            if (!title) {
                toast.error('Widget title is required');
                return;
            }

            const widgetId = initialData?.id || `widget-${Date.now()}`;
            const newWidget: Widget = {
                id: widgetId,
                type,
                title,
                options: {}
            };

            if (type === 'generic') {
                if (!endpoint) {
                    toast.error('Endpoint is required for Generic Widget');
                    return;
                }
                // Filter empty fields
                const validFields = fields.filter(f => f.label && f.path);
                if (validFields.length === 0) {
                    toast.error('At least one valid field is required');
                    return;
                }

                newWidget.options = {
                    endpoint,
                    fields: validFields
                };
            }
            finalWidget = newWidget;
        }

        onSave(finalWidget);
        onClose();
    };

    return (
        <div className={styles.overlay}>
            <div className={styles.modal}>
                <div className={styles.header}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <h2>{initialData ? 'Edit' : 'Add'} Widget</h2>
                        <button
                            onClick={handleSwitchMode}
                            className={styles.addBtn}
                            title={isJsonMode ? "Switch to Form" : "Switch to JSON"}
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', display: 'flex', gap: '0.3rem', alignItems: 'center' }}
                        >
                            <Code size={14} /> {isJsonMode ? 'Form' : 'Config'}
                        </button>
                    </div>
                    <button onClick={onClose} className={styles.closeBtn}><X size={20} /></button>
                </div>

                <div className={styles.body}>
                    {isJsonMode ? (
                        <div className={styles.field} style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                            <label>Raw Configuration (JSON)</label>
                            <textarea
                                value={rawJson}
                                onChange={e => setRawJson(e.target.value)}
                                style={{ flex: 1, minHeight: '300px', fontFamily: 'monospace', fontSize: '0.85rem', lineHeight: '1.4' }}
                                spellCheck={false}
                            />
                            {jsonError && <span style={{ color: '#ff4444', fontSize: '0.85rem' }}>{jsonError}</span>}
                        </div>
                    ) : (
                        <>
                            <div className={styles.field}>
                                <label>Widget Type</label>
                                <select
                                    value={type}
                                    onChange={(e) => setType(e.target.value as any)}
                                >
                                    <option value="generic">Generic (JSON API)</option>
                                    <option value="system-monitor">System Monitor</option>
                                    <option value="docker">Docker Stats</option>
                                    <option value="clock">Clock & Weather</option>
                                    <option value="weather">Weather Only</option>
                                </select>
                            </div>

                            {type === 'generic' && !initialData && (
                                <div className={styles.field} style={{ marginBottom: '0.5rem' }}>
                                    <label style={{ color: '#deb887' }}>Load Preset (Optional)</label>
                                    <select onChange={(e) => handleApplyPreset(e.target.value)} defaultValue="">
                                        <option value="" disabled>Select a preset to auto-fill...</option>
                                        {WIDGET_PRESETS.map(p => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div className={styles.field}>
                                <label>Title</label>
                                <input
                                    placeholder="My Widget"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                />
                            </div>

                            {type === 'generic' && (
                                <>
                                    <div className={styles.field}>
                                        <label>API Endpoint</label>
                                        <input
                                            placeholder="http://localhost:8989/api/v3/queue?apikey=..."
                                            value={endpoint}
                                            onChange={(e) => setEndpoint(e.target.value)}
                                        />
                                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                                            Must return JSON. Use full URL including API Key.
                                        </span>
                                    </div>

                                    <div className={styles.field}>
                                        <label>Data Fields</label>
                                        <div className={styles.fieldList}>
                                            <div className={styles.fieldHeader} style={{ display: 'flex', gap: '8px', marginBottom: '4px', fontSize: '0.8rem', opacity: 0.7 }}>
                                                <span style={{ flex: 1 }}>Label</span>
                                                <span style={{ flex: 1 }}>JSON Path</span>
                                                <span style={{ width: '60px' }}>Suffix</span>
                                                <span style={{ width: '70px' }}>Format</span>
                                                <span style={{ width: '24px' }}></span>
                                            </div>
                                            {fields.map((field, i) => (
                                                <div key={i} className={styles.fieldItem}>
                                                    <input
                                                        placeholder="Label"
                                                        value={field.label}
                                                        onChange={e => handleFieldChange(i, 'label', e.target.value)}
                                                        style={{ flex: 1 }}
                                                    />
                                                    <input
                                                        placeholder="total_records"
                                                        value={field.path}
                                                        onChange={e => handleFieldChange(i, 'path', e.target.value)}
                                                        style={{ flex: 1 }}
                                                    />
                                                    <input
                                                        placeholder="%"
                                                        value={field.suffix || ''}
                                                        onChange={e => handleFieldChange(i, 'suffix', e.target.value)}
                                                        style={{ width: '60px' }}
                                                    />
                                                    <select
                                                        value={field.format || ''}
                                                        onChange={e => handleFieldChange(i, 'format', e.target.value)}
                                                        style={{ width: '70px', padding: '0 4px' }}
                                                    >
                                                        <option value="">None</option>
                                                        <option value="number">Num</option>
                                                        <option value="bytes">Bytes</option>
                                                        <option value="percent">%</option>
                                                    </select>
                                                    <button onClick={() => handleRemoveField(i)} className={styles.removeBtn}>
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            ))}
                                            <button onClick={handleAddField} className={styles.addBtn}>
                                                <Plus size={14} style={{ display: 'inline', verticalAlign: 'middle' }} /> Add Field
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}
                        </>
                    )}
                </div>

                <div className={styles.footer}>
                    <button className={styles.cancelBtn} onClick={onClose}>Cancel</button>
                    <button className={styles.primaryBtn} onClick={handleSubmit}>Save Widget</button>
                </div>
            </div>
        </div>
    );
}
