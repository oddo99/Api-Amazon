import { Router } from 'express';
import { supabase } from '../lib/supabase';

const router = Router();

// Test Supabase connection
router.get('/test-supabase', async (req, res) => {
    try {
        // Test query - get all users
        const { data, error } = await supabase
            .from('User')
            .select('id, email, name')
            .limit(10);

        if (error) {
            return res.status(500).json({
                success: false,
                error: error.message
            });
        }

        res.json({
            success: true,
            message: 'Supabase connection working!',
            userCount: data?.length || 0,
            users: data
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

export default router;
