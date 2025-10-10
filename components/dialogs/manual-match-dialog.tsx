'use client'

import * as React from 'react'
import type { Runner } from '@/types/runner'
import type { DUVSearchResult } from '@/types/match'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'

interface ManualMatchDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  runner: Runner | null
  candidates: DUVSearchResult[]
  onConfirm: (runner: Runner, selectedDuvId: number | null) => Promise<void>
  loading?: boolean
}

export function ManualMatchDialog({
  open,
  onOpenChange,
  runner,
  candidates,
  onConfirm,
  loading = false,
}: ManualMatchDialogProps) {
  const [selectedDuvId, setSelectedDuvId] = React.useState<string | null>(null)
  const [isConfirming, setIsConfirming] = React.useState(false)

  // Reset selection when dialog opens/closes or runner changes
  React.useEffect(() => {
    if (!open) {
      setSelectedDuvId(null)
    }
  }, [open, runner])

  const handleConfirm = async () => {
    if (!runner) return

    setIsConfirming(true)
    try {
      const duvId = selectedDuvId === 'no-match' ? null : selectedDuvId ? Number(selectedDuvId) : null
      await onConfirm(runner, duvId)
      onOpenChange(false)
    } catch (error) {
      console.error('Error confirming match:', error)
    } finally {
      setIsConfirming(false)
    }
  }

  if (!runner) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manual Match Runner</DialogTitle>
          <DialogDescription>
            Select the correct DUV profile for this runner or mark as "No Match Found"
          </DialogDescription>
        </DialogHeader>

        {/* Runner Information */}
        <div className="rounded-lg border p-4 bg-muted/50">
          <h3 className="font-semibold mb-2">Runner Details</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
            <div>
              <span className="text-muted-foreground">Name:</span>{' '}
              <span className="font-medium">
                {runner.firstname} {runner.lastname}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Nationality:</span>{' '}
              <span className="font-medium">{runner.nationality}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Gender:</span>{' '}
              <span className="font-medium">{runner.gender}</span>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">Loading candidates...</div>
          </div>
        )}

        {/* Candidate Matches */}
        {!loading && (
          <RadioGroup value={selectedDuvId || ''} onValueChange={setSelectedDuvId}>
            <div className="space-y-3">
              <h3 className="font-semibold text-sm">Candidate Matches</h3>

              {candidates.length === 0 ? (
                <div className="text-sm text-muted-foreground py-4 text-center">
                  No candidates found from DUV API
                </div>
              ) : (
                candidates.map((candidate) => (
                  <div
                    key={candidate.PersonID}
                    className={`flex items-start space-x-3 rounded-lg border p-3 transition-colors ${
                      selectedDuvId === String(candidate.PersonID)
                        ? 'border-primary bg-primary/5'
                        : 'hover:bg-muted/50'
                    }`}
                  >
                    <RadioGroupItem
                      value={String(candidate.PersonID)}
                      id={`candidate-${candidate.PersonID}`}
                      className="mt-1"
                    />
                    <Label
                      htmlFor={`candidate-${candidate.PersonID}`}
                      className="flex-1 cursor-pointer"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">
                            {candidate.Firstname} {candidate.Lastname}
                          </span>
                          <Badge variant="secondary" className="ml-2">
                            {(candidate.confidence * 100).toFixed(0)}% match
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm text-muted-foreground">
                          <div>
                            <span className="font-medium">YOB:</span> {candidate.YOB}
                          </div>
                          <div>
                            <span className="font-medium">Nation:</span> {candidate.Nation}
                          </div>
                          <div>
                            <span className="font-medium">Sex:</span> {candidate.Sex}
                          </div>
                          <div>
                            <span className="font-medium">PB:</span>{' '}
                            {candidate.PersonalBest ? `${parseFloat(candidate.PersonalBest).toFixed(2)} km` : '-'}
                          </div>
                        </div>
                      </div>
                    </Label>
                  </div>
                ))
              )}

              {/* No Match Option */}
              <div
                className={`flex items-start space-x-3 rounded-lg border p-3 transition-colors ${
                  selectedDuvId === 'no-match'
                    ? 'border-destructive bg-destructive/5'
                    : 'hover:bg-muted/50'
                }`}
              >
                <RadioGroupItem value="no-match" id="no-match" className="mt-1" />
                <Label htmlFor="no-match" className="flex-1 cursor-pointer">
                  <div className="space-y-1">
                    <div className="font-medium text-destructive">No Match Found</div>
                    <div className="text-sm text-muted-foreground">
                      Mark this runner as having no matching DUV profile
                    </div>
                  </div>
                </Label>
              </div>
            </div>
          </RadioGroup>
        )}

        {/* Footer */}
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isConfirming}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedDuvId || isConfirming || loading}
          >
            {isConfirming ? 'Confirming...' : 'Confirm Match'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
