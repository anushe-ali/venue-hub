import { createClient } from '@/lib/supabase/client'
import type { UserRole } from '@/types'

// ============================================================
// AUDIT LOGGING
// ============================================================

export async function createAuditLog(
  actionType: string,
  targetType: string,
  targetId: string,
  description: string,
  oldValue?: Record<string, unknown>,
  newValue?: Record<string, unknown>
): Promise<void> {
  const supabase = createClient()

  const { error } = await supabase.from('admin_audit_logs').insert({
    action_type: actionType,
    target_type: targetType,
    target_id: targetId,
    description,
    old_value: oldValue,
    new_value: newValue,
  })

  if (error) {
    console.error('Failed to create audit log:', error)
    // Don't throw - audit logging failure shouldn't block the operation
  }
}

// ============================================================
// USER MANAGEMENT
// ============================================================

export async function updateUserRole(
  userId: string,
  newRole: UserRole,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient()

  try {
    // Get current user (admin)
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    if (!currentUser) {
      return { success: false, error: 'Not authenticated' }
    }

    // Get current profile role for validation
    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', currentUser.id)
      .single()

    if (currentProfile?.role !== 'admin') {
      return { success: false, error: 'Unauthorized: Admin access required' }
    }

    // Get target user's current role
    const { data: targetProfile } = await supabase
      .from('profiles')
      .select('role, full_name, email')
      .eq('id', userId)
      .single()

    if (!targetProfile) {
      return { success: false, error: 'User not found' }
    }

    // If changing from admin role, check if this is the last admin
    if (targetProfile.role === 'admin' && newRole !== 'admin') {
      const { count } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'admin')
        .eq('is_active', true)

      if (count === 1) {
        return { success: false, error: 'Cannot remove the last active admin' }
      }
    }

    // Update the role
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', userId)

    if (updateError) {
      return { success: false, error: updateError.message }
    }

    // Create audit log
    await createAuditLog(
      'user_role_change',
      'user',
      userId,
      `Changed user role from ${targetProfile.role} to ${newRole}. Reason: ${reason}`,
      { role: targetProfile.role, full_name: targetProfile.full_name, email: targetProfile.email },
      { role: newRole }
    )

    return { success: true }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, error: message }
  }
}

export async function toggleUserStatus(
  userId: string,
  reason: string
): Promise<{ success: boolean; error?: string; newStatus?: boolean }> {
  const supabase = createClient()

  try {
    // Get current user (admin)
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    if (!currentUser) {
      return { success: false, error: 'Not authenticated' }
    }

    // Prevent self-deactivation
    if (currentUser.id === userId) {
      return { success: false, error: 'Cannot deactivate your own account' }
    }

    // Get current profile role for validation
    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', currentUser.id)
      .single()

    if (currentProfile?.role !== 'admin') {
      return { success: false, error: 'Unauthorized: Admin access required' }
    }

    // Get target user's current status and role
    const { data: targetProfile } = await supabase
      .from('profiles')
      .select('is_active, role, full_name, email')
      .eq('id', userId)
      .single()

    if (!targetProfile) {
      return { success: false, error: 'User not found' }
    }

    const newStatus = !targetProfile.is_active

    // If deactivating an admin, check if this is the last active admin
    if (targetProfile.role === 'admin' && targetProfile.is_active) {
      const { count } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'admin')
        .eq('is_active', true)

      if (count === 1) {
        return { success: false, error: 'Cannot deactivate the last active admin' }
      }
    }

    // Update the status
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ is_active: newStatus })
      .eq('id', userId)

    if (updateError) {
      return { success: false, error: updateError.message }
    }

    // Create audit log
    const action = newStatus ? 'user_activate' : 'user_deactivate'
    const description = newStatus
      ? `Activated user account. Reason: ${reason}`
      : `Deactivated user account. Reason: ${reason}`

    await createAuditLog(
      action,
      'user',
      userId,
      description,
      { is_active: targetProfile.is_active, full_name: targetProfile.full_name, email: targetProfile.email },
      { is_active: newStatus }
    )

    return { success: true, newStatus }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, error: message }
  }
}

// ============================================================
// BOOKING MANAGEMENT
// ============================================================

export async function adminCancelBooking(
  bookingId: string,
  reason: string,
  refundAmount: number
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient()

  try {
    // Get current user (admin)
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    if (!currentUser) {
      return { success: false, error: 'Not authenticated' }
    }

    // Get current profile role for validation
    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', currentUser.id)
      .single()

    if (currentProfile?.role !== 'admin') {
      return { success: false, error: 'Unauthorized: Admin access required' }
    }

    // Get booking details
    const { data: booking } = await supabase
      .from('bookings')
      .select('*, venue:venues(name), organizer:profiles!organizer_id(full_name, email)')
      .eq('id', bookingId)
      .single()

    if (!booking) {
      return { success: false, error: 'Booking not found' }
    }

    // Update booking status
    const { error: updateError } = await supabase
      .from('bookings')
      .update({
        status: 'cancelled',
        cancellation_reason: `Admin cancelled: ${reason}`,
        cancelled_at: new Date().toISOString(),
      })
      .eq('id', bookingId)

    if (updateError) {
      return { success: false, error: updateError.message }
    }

    // Create refund payment record if refund amount > 0
    if (refundAmount > 0) {
      const { error: paymentError } = await supabase
        .from('payments')
        .insert({
          booking_id: bookingId,
          payer_id: booking.organizer_id,
          amount: refundAmount,
          payment_type: 'refund',
          notes: `Admin-issued refund: ${reason}`,
        })

      if (paymentError) {
        console.error('Failed to create refund payment:', paymentError)
        // Continue with cancellation even if refund payment creation fails
      }
    }

    // Create audit log
    await createAuditLog(
      'booking_cancel',
      'booking',
      bookingId,
      `Admin cancelled booking. Reason: ${reason}. Refund: ${refundAmount}`,
      {
        status: booking.status,
        event_name: booking.event_name,
        venue: (booking.venue as any)?.name,
        organizer: (booking.organizer as any)?.full_name,
      },
      { status: 'cancelled', refund_amount: refundAmount }
    )

    return { success: true }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, error: message }
  }
}

// ============================================================
// SETTINGS MANAGEMENT
// ============================================================

export async function updatePlatformSetting(
  key: string,
  value: unknown
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient()

  try {
    // Get current user (admin)
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    if (!currentUser) {
      return { success: false, error: 'Not authenticated' }
    }

    // Get current profile role for validation
    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', currentUser.id)
      .single()

    if (currentProfile?.role !== 'admin') {
      return { success: false, error: 'Unauthorized: Admin access required' }
    }

    // Get old value for audit log
    const { data: oldSetting } = await supabase
      .from('platform_settings')
      .select('value')
      .eq('key', key)
      .single()

    // Update setting
    const { error: updateError } = await supabase
      .from('platform_settings')
      .update({
        value,
        updated_by: currentUser.id,
        updated_at: new Date().toISOString(),
      })
      .eq('key', key)

    if (updateError) {
      return { success: false, error: updateError.message }
    }

    // Create audit log
    await createAuditLog(
      'settings_update',
      'settings',
      key,
      `Updated platform setting: ${key}`,
      { value: oldSetting?.value },
      { value }
    )

    return { success: true }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, error: message }
  }
}
