'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { submitOffer } from '@/services/offers.service'

interface Props {
  listingId: string
  listingTitle: string
  listingPrice: number
  onClose: () => void
}

type FormValues = { price: number }

export function OfferModal({ listingId, listingTitle, listingPrice, onClose }: Props) {
  const queryClient = useQueryClient()

  const schema = z.object({
    price: z
      .number({ invalid_type_error: 'Enter a valid amount' })
      .positive('Must be greater than $0')
      .max(listingPrice, `Offer cannot exceed the listing price of $${listingPrice.toFixed(2)}`),
  })

  const { register, handleSubmit, formState: { errors }, setFocus } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { price: listingPrice },
  })

  useEffect(() => { setFocus('price') }, [setFocus])

  const mutation = useMutation({
    mutationFn: (price: number) => submitOffer(listingId, price),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['listing', listingId] })
      queryClient.invalidateQueries({ queryKey: ['offers'] })
      onClose()
    },
  })

  function onSubmit(values: FormValues) {
    mutation.mutate(values.price)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-md rounded-t-2xl bg-white p-6 sm:rounded-2xl">
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h2 className="font-serif text-lg text-stone-800">Make an Offer</h2>
            <p className="mt-0.5 line-clamp-1 text-sm text-stone-400">{listingTitle}</p>
          </div>
          <button onClick={onClose} className="ml-4 shrink-0 rounded-full p-1 text-stone-400 hover:bg-beige-200 hover:text-stone-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mb-4 text-sm text-stone-500">
          Listed at <span className="font-medium text-stone-800">${listingPrice.toFixed(2)}</span>
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-stone-700">Your offer</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-stone-400">$</span>
              <input
                {...register('price', { valueAsNumber: true })}
                type="number"
                step="0.01"
                min="0.01"
                max={listingPrice}
                className="input pl-7"
                placeholder={listingPrice.toFixed(2)}
              />
            </div>
            {errors.price && (
              <p className="mt-1 text-xs text-red-500">{errors.price.message}</p>
            )}
          </div>

          {mutation.isError && (
            <p className="text-sm text-red-500">
              {(mutation.error as Error).message ?? 'Failed to submit offer. Please try again.'}
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-ghost flex-1">
              Cancel
            </button>
            <button type="submit" disabled={mutation.isPending} className="btn-primary flex-1">
              {mutation.isPending ? 'Submitting…' : 'Submit Offer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
