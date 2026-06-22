'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { INDIAN_STATES } from '@smarterp/shared';
import { api, ApiSuccess, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';

const companyFormSchema = z
    .object({
        name: z.string().min(1, 'Company name is required').max(255),
        address: z.string().max(1000).optional(),
        contactNumber: z.string().max(20).optional(),
        email: z.string().email('Invalid email').optional().or(z.literal('')),
        gstNumber: z.string().max(50).optional(),
        panNumber: z.string().max(20).optional(),
        state: z.string().max(100).optional(),
        stateCode: z.string().max(10).optional(),
        currency: z.enum(['INR', 'USD', 'EUR', 'GBP']).default('INR'),
        financialYearStart: z.string().min(1, 'FY start is required'),
        financialYearEnd: z.string().min(1, 'FY end is required'),
    })
    .refine(
        (d) => new Date(d.financialYearEnd) > new Date(d.financialYearStart),
        { message: 'FY end must be after FY start', path: ['financialYearEnd'] },
    );

type CompanyFormValues = z.infer<typeof companyFormSchema>;

interface CompanyFormProps {
    mode: 'create' | 'edit';
    companyId?: string;
    initialData?: Partial<CompanyFormValues>;
    onSuccess?: (company: any) => void;
}

export function CompanyForm({ mode, companyId, initialData, onSuccess }: CompanyFormProps) {
    const router = useRouter();
    const { setActiveCompanyId } = useAuth();
    const [serverError, setServerError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const today = new Date();
    const defaultFYStart = `${today.getFullYear()}-04-01`;
    const defaultFYEnd = `${today.getFullYear() + 1}-03-31`;

    const {
        register,
        handleSubmit,
        setValue,
        watch,
        formState: { errors },
    } = useForm<CompanyFormValues>({
        resolver: zodResolver(companyFormSchema),
        defaultValues: {
            currency: 'INR',
            financialYearStart: defaultFYStart,
            financialYearEnd: defaultFYEnd,
            ...initialData,
        },
    });

    // Auto-populate state code from state name
    const stateValue = watch('state');
    useEffect(() => {
        const match = INDIAN_STATES.find((s) => s.name === stateValue);
        if (match) setValue('stateCode', match.code);
    }, [stateValue, setValue]);

    async function onSubmit(values: CompanyFormValues) {
        setServerError(null);
        setSubmitting(true);
        try {
            const payload: any = {
                ...values,
                financialYearStart: new Date(values.financialYearStart).toISOString(),
                financialYearEnd: new Date(values.financialYearEnd).toISOString(),
            };
            // Strip empty optional strings to avoid backend validation issues
            Object.keys(payload).forEach((k) => {
                if (payload[k] === '' || payload[k] === undefined) delete payload[k];
            });

            let res;
            if (mode === 'create') {
                res = await api.post<ApiSuccess<any> | ApiError>('/companies', payload);
            } else {
                res = await api.patch<ApiSuccess<any> | ApiError>(`/companies/${companyId}`, payload);
            }

            if (!res.data.success) {
                throw new Error((res.data as ApiError).error.message);
            }
            const company = (res.data as ApiSuccess<any>).data;
            if (onSuccess) {
                onSuccess(company);
            } else {
                if (mode === 'create') {
                    setActiveCompanyId(company.id);
                    localStorage.setItem('smarterp_activeCompanyId', company.id);
                    router.push('/dashboard');
                } else {
                    router.push('/companies/select');
                }
            }
        } catch (err: any) {
            const msg = err?.response?.data?.error?.message || err?.message || 'Failed to save company';
            setServerError(msg);
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {serverError && (
                <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                    {serverError}
                </div>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>Company Information</CardTitle>
                    <CardDescription>Basic details about your business</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="md:col-span-2">
                        <Label htmlFor="name">Company name *</Label>
                        <Input id="name" {...register('name')} placeholder="Ritik Trading Co." />
                        {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name.message}</p>}
                    </div>
                    <div className="md:col-span-2">
                        <Label htmlFor="address">Address</Label>
                        <Textarea id="address" {...register('address')} rows={2} placeholder="Street, City, State, Pincode" />
                    </div>
                    <div>
                        <Label htmlFor="contactNumber">Contact number</Label>
                        <Input id="contactNumber" {...register('contactNumber')} placeholder="+91 98765 43210" />
                    </div>
                    <div>
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" type="email" {...register('email')} placeholder="contact@company.com" />
                        {errors.email && <p className="mt-1 text-xs text-destructive">{errors.email.message}</p>}
                    </div>
                    <div>
                        <Label htmlFor="gstNumber">GSTIN</Label>
                        <Input id="gstNumber" {...register('gstNumber')} placeholder="27AABCU9603R1ZM" />
                    </div>
                    <div>
                        <Label htmlFor="panNumber">PAN</Label>
                        <Input id="panNumber" {...register('panNumber')} placeholder="AABCU9603R" />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Location & Financial Year</CardTitle>
                    <CardDescription>For GST and reporting</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                        <Label htmlFor="state">State</Label>
                        <Select id="state" {...register('state')}>
                            <option value="">— Select state —</option>
                            {INDIAN_STATES.map((s) => (
                                <option key={s.code} value={s.name}>
                                    {s.name}
                                </option>
                            ))}
                        </Select>
                    </div>
                    <div>
                        <Label htmlFor="stateCode">State code</Label>
                        <Input id="stateCode" {...register('stateCode')} placeholder="27" />
                    </div>
                    <div>
                        <Label htmlFor="currency">Currency</Label>
                        <Select id="currency" {...register('currency')}>
                            <option value="INR">INR — Indian Rupee</option>
                            <option value="USD">USD — US Dollar</option>
                            <option value="EUR">EUR — Euro</option>
                            <option value="GBP">GBP — British Pound</option>
                        </Select>
                    </div>
                    <div />
                    <div>
                        <Label htmlFor="financialYearStart">Financial year start *</Label>
                        <Input id="financialYearStart" type="date" {...register('financialYearStart')} />
                        {errors.financialYearStart && (
                            <p className="mt-1 text-xs text-destructive">{errors.financialYearStart.message}</p>
                        )}
                    </div>
                    <div>
                        <Label htmlFor="financialYearEnd">Financial year end *</Label>
                        <Input id="financialYearEnd" type="date" {...register('financialYearEnd')} />
                        {errors.financialYearEnd && (
                            <p className="mt-1 text-xs text-destructive">{errors.financialYearEnd.message}</p>
                        )}
                    </div>
                </CardContent>
            </Card>

            <div className="flex items-center justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => router.back()}>
                    Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                    {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    {mode === 'create' ? 'Create Company' : 'Save Changes'}
                </Button>
            </div>
        </form>
    );
}