'use client'

import * as React from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
  flexRender,
} from '@tanstack/react-table'
import ReactCountryFlag from 'react-country-flag'
import { useAuth } from '@/lib/auth/auth-context'
import type { Runner, Gender } from '@/types/runner'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { ArrowUpDown, Pencil, Check, ChevronsUpDown, ChevronDown, ChevronUp } from 'lucide-react'
import { getCountryCodeForFlag } from '@/lib/utils/country-codes'
import { getCountryName } from '@/lib/utils/country-names'
import { cn } from '@/lib/utils'

interface RunnerTableProps {
  runners: Runner[]
  metric: 'last-3-years' | 'all-time'
  onManualMatch: (runner: Runner) => void
  onRowClick: (runnerId: number) => void
}

export function RunnerTable({ runners, metric, onManualMatch, onRowClick }: RunnerTableProps) {
  const { isAdmin } = useAuth()
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<Record<string, boolean>>({
    personalBestAllTime: metric === 'all-time',
    personalBestLast3Years: metric === 'last-3-years',
  })
  const [searchQuery, setSearchQuery] = React.useState('')
  const [countryComboboxOpen, setCountryComboboxOpen] = React.useState(false)
  const [editingRunner, setEditingRunner] = React.useState<Runner | null>(null)
  const [editForm, setEditForm] = React.useState({
    firstname: '',
    lastname: '',
    nationality: '',
    gender: '' as 'M' | 'W' | '',
    dns: false
  })
  const [isSaving, setIsSaving] = React.useState(false)
  const [expandedRows, setExpandedRows] = React.useState<Set<number>>(new Set())

  // Debounced search
  const debouncedSearchQuery = useDebounce(searchQuery, 300)

  // Update column visibility when metric changes
  React.useEffect(() => {
    setColumnVisibility({
      personalBestAllTime: metric === 'all-time',
      personalBestLast3Years: metric === 'last-3-years',
    })
  }, [metric])

  React.useEffect(() => {
    setColumnFilters((prev) => {
      const filtered = prev.filter((f) => f.id !== 'name')
      if (debouncedSearchQuery) {
        return [...filtered, { id: 'name', value: debouncedSearchQuery }]
      }
      return filtered
    })
  }, [debouncedSearchQuery])

  // Handle opening edit dialog
  function openEditDialog(runner: Runner) {
    setEditingRunner(runner)
    setEditForm({
      firstname: runner.firstname,
      lastname: runner.lastname,
      nationality: runner.nationality,
      gender: runner.gender,
      dns: runner.dns || false
    })
  }

  // Handle closing edit dialog
  function closeEditDialog() {
    setEditingRunner(null)
    setEditForm({ firstname: '', lastname: '', nationality: '', gender: '', dns: false })
  }

  // Handle saving edits
  async function saveEdit() {
    if (!editingRunner) return

    setIsSaving(true)
    try {
      const response = await fetch(`/api/runners/${editingRunner.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      })

      if (!response.ok) {
        throw new Error('Failed to update runner')
      }

      // Reload the page to show updated data
      window.location.reload()
    } catch (err) {
      console.error('Error updating runner:', err)
      alert(err instanceof Error ? err.message : 'Failed to update runner')
    } finally {
      setIsSaving(false)
    }
  }

  // Toggle expanded row
  function toggleRow(runnerId: number) {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(runnerId)) {
      newExpanded.delete(runnerId)
    } else {
      newExpanded.add(runnerId)
    }
    setExpandedRows(newExpanded)
  }

  const columns: ColumnDef<Runner>[] = React.useMemo(
    () => [
      {
        accessorKey: 'rank',
        header: 'Rank',
        cell: ({ row }) => {
          const rank = (row.original as any).rank
          return rank ? <div className="font-bold text-center w-12">{rank}</div> : <div className="text-muted-foreground text-center w-12">-</div>
        },
        size: 60,
      },
      {
        accessorKey: 'name',
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
              className="h-8 px-2"
            >
              Name
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          )
        },
        accessorFn: (row) => `${row.firstname} ${row.lastname}`,
        cell: ({ row }) => (
          <div>
            <div className="font-medium">{row.original.firstname} {row.original.lastname}</div>
          </div>
        ),
        filterFn: (row, id, value) => {
          const name = `${row.original.firstname} ${row.original.lastname}`.toLowerCase()
          return name.includes(String(value).toLowerCase())
        },
      },
      {
        accessorKey: 'nationality',
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
              className="h-8 px-2"
            >
              Nation
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          )
        },
        cell: ({ row }) => {
          const threeLetterCode = row.getValue('nationality') as string
          const twoLetterCode = getCountryCodeForFlag(threeLetterCode)
          const countryName = getCountryName(threeLetterCode)
          return (
            <div className="flex items-center gap-2" title={countryName}>
              <ReactCountryFlag
                countryCode={twoLetterCode}
                svg
                style={{
                  width: '2em',
                  height: '1.5em',
                }}
                title={countryName}
              />
              <span className="text-sm font-medium">{threeLetterCode}</span>
            </div>
          )
        },
        filterFn: (row, id, value) => {
          if (value === 'all') return true
          return row.getValue(id) === value
        },
      },
      {
        accessorKey: 'gender',
        header: 'Gender',
        cell: ({ row }) => <div>{row.getValue('gender')}</div>,
        filterFn: (row, id, value) => {
          if (value === 'all') return true
          return row.getValue(id) === value
        },
      },
      {
        accessorKey: 'personalBestAllTime',
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
              className="h-8 px-2"
            >
              PB All-Time
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          )
        },
        cell: ({ row }) => {
          const pb = row.getValue('personalBestAllTime') as number | null
          const pbYear = row.original.personalBestAllTimeYear
          return (
            <div className="text-right">
              {pb ? (
                <>
                  {pb.toFixed(3)} km{pbYear && <span className="text-muted-foreground text-xs ml-1">({pbYear})</span>}
                </>
              ) : '-'}
            </div>
          )
        },
      },
      {
        accessorKey: 'personalBestLast3Years',
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
              className="h-8 px-2"
            >
              PB 2023-2025
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          )
        },
        cell: ({ row }) => {
          const pb = row.getValue('personalBestLast3Years') as number | null
          const pbYear = row.original.personalBestLast3YearsYear
          return (
            <div className="text-right">
              {pb ? (
                <>
                  {pb.toFixed(3)} km{pbYear && <span className="text-muted-foreground text-xs ml-1">({pbYear})</span>}
                </>
              ) : '-'}
            </div>
          )
        },
      },
      {
        accessorKey: 'age',
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
              className="h-8 px-2"
            >
              YOB
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          )
        },
        cell: ({ row }) => {
          const age = row.original.age
          const dob = row.original.dateOfBirth
          if (dob) {
            const yob = new Date(dob).getFullYear()
            return <div className="text-center">{yob}</div>
          }
          return <div className="text-center text-muted-foreground">-</div>
        },
      },
      // Only include actions column if admin
      ...(isAdmin ? [{
        id: 'actions' as const,
        header: 'Actions',
        cell: ({ row }: { row: any }) => {
          const runner = row.original as Runner
          return (
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  openEditDialog(runner)
                }}
                className="whitespace-nowrap"
              >
                <Pencil className="h-4 w-4 mr-1" />
                Edit
              </Button>
              {runner.matchStatus === 'unmatched' && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    onManualMatch(runner)
                  }}
                  className="whitespace-nowrap"
                >
                  Manual Match
                </Button>
              )}
            </div>
          )
        },
      }] : []),
    ],
    [onManualMatch, isAdmin]
  )

  const table = useReactTable({
    data: runners,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
    },
  })

  const nationalityFilter = (columnFilters.find((f) => f.id === 'nationality')?.value as string) || 'all'

  // Get unique countries from runners
  const uniqueCountries = React.useMemo(() => {
    const countries = Array.from(new Set(runners.map(r => r.nationality))).sort()
    return countries
  }, [runners])

  return (
    <div className="w-full space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Input
          placeholder="Search by name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-sm"
        />
        <Popover open={countryComboboxOpen} onOpenChange={setCountryComboboxOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={countryComboboxOpen}
              className="w-full sm:w-[250px] justify-between"
            >
              {nationalityFilter === 'all' ? (
                'All Countries'
              ) : (
                <div className="flex items-center gap-2">
                  <ReactCountryFlag
                    countryCode={getCountryCodeForFlag(nationalityFilter)}
                    svg
                    style={{
                      width: '1.5em',
                      height: '1em',
                    }}
                  />
                  <span>{nationalityFilter}</span>
                </div>
              )}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[250px] p-0" align="start">
            <Command>
              <CommandInput placeholder="Search country..." />
              <CommandList>
                <CommandEmpty>No country found.</CommandEmpty>
                <CommandGroup>
                  <CommandItem
                    value="all"
                    onSelect={() => {
                      setColumnFilters((prev) => prev.filter((f) => f.id !== 'nationality'))
                      setCountryComboboxOpen(false)
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        nationalityFilter === 'all' ? "opacity-100" : "opacity-0"
                      )}
                    />
                    All Countries
                  </CommandItem>
                  {uniqueCountries.map((country) => {
                    const twoLetterCode = getCountryCodeForFlag(country)
                    return (
                      <CommandItem
                        key={country}
                        value={country}
                        onSelect={(currentValue) => {
                          setColumnFilters((prev) => {
                            const filtered = prev.filter((f) => f.id !== 'nationality')
                            return [...filtered, { id: 'nationality', value: currentValue.toUpperCase() }]
                          })
                          setCountryComboboxOpen(false)
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            nationalityFilter === country ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <div className="flex items-center gap-2">
                          <ReactCountryFlag
                            countryCode={twoLetterCode}
                            svg
                            style={{
                              width: '1.5em',
                              height: '1em',
                            }}
                          />
                          <span>{country}</span>
                        </div>
                      </CommandItem>
                    )
                  })}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden grid grid-cols-1 sm:grid-cols-2 gap-2">
        {table.getRowModel().rows?.length ? (
          table.getRowModel().rows.map((row) => {
            const runner = row.original
            const isExpanded = expandedRows.has(runner.id)
            const threeLetterCode = runner.nationality
            const twoLetterCode = getCountryCodeForFlag(threeLetterCode)
            const countryName = getCountryName(threeLetterCode)

            // Get selected and alternate PB values
            const selectedPB = metric === 'last-3-years' ? runner.personalBestLast3Years : runner.personalBestAllTime
            const selectedPBYear = metric === 'last-3-years' ? runner.personalBestLast3YearsYear : runner.personalBestAllTimeYear
            const selectedLabel = metric === 'last-3-years' ? '2023-2025' : 'All-Time'

            const alternatePB = metric === 'last-3-years' ? runner.personalBestAllTime : runner.personalBestLast3Years
            const alternatePBYear = metric === 'last-3-years' ? runner.personalBestAllTimeYear : runner.personalBestLast3YearsYear
            const alternateLabel = metric === 'last-3-years' ? 'All-Time' : '2023-2025'

            const rank = (runner as any).rank

            return (
              <div key={row.id} className="border rounded-lg overflow-hidden">
                {/* Collapsed View - Always Visible */}
                <div
                  className="p-3 cursor-pointer hover:bg-accent/50 flex gap-3"
                  onClick={() => onRowClick(runner.id)}
                >
                  {/* Rank - spans both rows */}
                  {rank && (
                    <div className="flex items-center justify-center w-8 font-bold text-lg text-primary">
                      {rank}
                    </div>
                  )}

                  {/* Main content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="font-medium text-sm">{runner.firstname} {runner.lastname}</div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleRow(runner.id)
                        }}
                        className="p-1 hover:bg-accent rounded-md flex-shrink-0"
                      >
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap">
                      <ReactCountryFlag
                        countryCode={twoLetterCode}
                        svg
                        style={{
                          width: '1.2em',
                          height: '0.8em',
                        }}
                        title={countryName}
                      />
                      <span>{threeLetterCode}</span>
                      <span>•</span>
                      <span className="font-medium text-foreground">
                        {selectedPB ? (
                          <>
                            {selectedPB.toFixed(3)}km
                            {selectedPBYear && <span className="text-muted-foreground ml-0.5">({selectedPBYear})</span>}
                          </>
                        ) : 'No PB'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Expanded View - Additional Details */}
                {isExpanded && (
                  <div className="px-4 pb-4 space-y-3 bg-accent/20 border-t">
                    <div className="pt-3">
                      <div className="text-xs text-muted-foreground">PB {alternateLabel}</div>
                      <div className="text-sm font-medium">
                        {alternatePB ? (
                          <>
                            {alternatePB.toFixed(3)} km
                            {alternatePBYear && (
                              <span className="text-xs text-muted-foreground ml-1">({alternatePBYear})</span>
                            )}
                          </>
                        ) : '-'}
                      </div>
                    </div>
                    {runner.dateOfBirth && (
                      <div>
                        <div className="text-xs text-muted-foreground">Year of Birth</div>
                        <div className="text-sm font-medium">{new Date(runner.dateOfBirth).getFullYear()}</div>
                      </div>
                    )}
                    {isAdmin && (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            openEditDialog(runner)
                          }}
                          className="flex-1"
                        >
                          <Pencil className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                        {runner.matchStatus === 'unmatched' && (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              onManualMatch(runner)
                            }}
                            className="flex-1"
                          >
                            Manual Match
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })
        ) : (
          <div className="col-span-full border rounded-lg p-8 text-center text-muted-foreground">
            No results.
          </div>
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="whitespace-nowrap">
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                  onClick={() => onRowClick(row.original.id)}
                  className="cursor-pointer hover:bg-muted/50"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="whitespace-nowrap">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Results count */}
      <div className="text-sm text-muted-foreground">
        Showing {table.getRowModel().rows.length} of {runners.length} runner(s)
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingRunner} onOpenChange={(open) => !open && closeEditDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Runner</DialogTitle>
            <DialogDescription>
              Make changes to runner information. Click save when you&apos;re done.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="firstname" className="text-right">
                First Name
              </Label>
              <Input
                id="firstname"
                value={editForm.firstname}
                onChange={(e) => setEditForm({ ...editForm, firstname: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="lastname" className="text-right">
                Last Name
              </Label>
              <Input
                id="lastname"
                value={editForm.lastname}
                onChange={(e) => setEditForm({ ...editForm, lastname: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="nationality" className="text-right">
                Nationality
              </Label>
              <Input
                id="nationality"
                value={editForm.nationality}
                onChange={(e) => setEditForm({ ...editForm, nationality: e.target.value.toUpperCase() })}
                className="col-span-3"
                maxLength={3}
                placeholder="3-letter code (e.g., USA, GER, CRO)"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="gender" className="text-right">
                Gender
              </Label>
              <Select
                value={editForm.gender}
                onValueChange={(value: 'M' | 'W') => setEditForm({ ...editForm, gender: value })}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="M">M</SelectItem>
                  <SelectItem value="W">W</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="dns" className="text-right">
                DNS
              </Label>
              <div className="col-span-3 flex items-center space-x-2">
                <Checkbox
                  id="dns"
                  checked={editForm.dns}
                  onCheckedChange={(checked) => setEditForm({ ...editForm, dns: checked as boolean })}
                />
                <label
                  htmlFor="dns"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Did Not Start (exclude from lists and predictions)
                </label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeEditDialog} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={saveEdit} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Custom debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = React.useState<T>(value)

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}
